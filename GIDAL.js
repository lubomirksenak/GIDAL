/*
#######################################################################################################################
Geospatial identification of the extent of war damage on agricultural land in the Google Earth Engine cloud environment

-----------------------------------------------------------------------------------------------------------------------
Code developed by: Ľubomír Kseňak, Jakub Kuraj - Technical University of Košice

-----------------------------------------------------------------------------------------------------------------------
Used indices:
 - Normalized Difference Vegetation Index (NDVI)
 - Soil Adjusted Vegetation Index (SAVI)
 
Used classification algorithms:
 - K-means clustering
 - Random Forest classifier
 
#######################################################################################################################
*/

// Define AOI
var geometry = ee.FeatureCollection("projects/ee-ksenaklubomir1/assets/Volnovaskyi");

// Select and read Data Načítanie prvej snímky Sentinel-2 z daného časového intervalu
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterDate('2024-07-01', '2024-07-30')
              .filterBounds(geometry)
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
              .median()
              .clip(geometry);

// Visualization of selected image
var visParams = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000,
  gamma: 1.4
};

// Add AOI boundaries into the map
Map.addLayer(geometry.style({
    color: 'black',
    fillColor: '00000000',
    width: 4
  }), 
  {}, 
  'AOI outline'
);

// Add S2 image into the map
Map.centerObject(geometry, 10);
Map.addLayer(s2, visParams, 'Sentinel-2 Image');

/*###################################################################################################################*/
/* 1) SPECTRAL INDICES CALCULATION 
/*###################################################################################################################*/

// NDVI and SAVI calculation
var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var savi = s2.expression(
  '((NIR - RED) / (NIR + RED + L)) * (1 + L)',
  {
    'NIR': s2.select('B8'),
    'RED': s2.select('B4'),
    'L': 0.5
  }
).rename('SAVI');
print('VEGETATION INDICES EXTRACTION RESULTS:');

// Loading ESA WorldCover and masking agriculture land
var worldcover = ee.Image('ESA/WorldCover/v100/2020').clip(geometry);
var agricultureMask = worldcover.eq(40);

// Applying mask to NDVI and SAVI
var ndvi_agri = ndvi.updateMask(agricultureMask);
var savi_agri = savi.updateMask(agricultureMask);

// Generating binary masks (NDVI > 0.3, SAVI > 0.6)
var ndviMask = ndvi_agri.gt(0.3).rename('NDVI_Mask');
var saviMask = savi_agri.gt(0.6).rename('SAVI_Mask');

// Converting false mask values to transparent
var transparentNdviMask = ndviMask.updateMask(ndviMask);
var transparentSaviMask = saviMask.updateMask(saviMask);

// Function to calculate mask area in km²
function calculateMaskArea(mask, maskName) {
  var areaImage = ee.Image.pixelArea().updateMask(mask);
  var area = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geometry,
    scale: 10,
    maxPixels: 1e13
  }).get('area');
  
  // Convert to km2 and format
  var areaKm2 = ee.Number(area).divide(1e6);

  // Create the output string using ee.String.cat()
  var outputString = ee.String(maskName).cat(' mask area: ')
                        .cat(areaKm2.format('%.3f'))
                        .cat(' km²');
  
  // Print the result
  print(outputString);
}

// Calculate areas for both masks
calculateMaskArea(ndviMask, 'NDVI');
calculateMaskArea(saviMask, 'SAVI');
print('---------------------------------------');

/*###################################################################################################################*/
/* 2) UNSUPERVISED CLASSIFICATION 
/*###################################################################################################################*/

// K-means Clustering

// Define spectral bands
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create dataset for classification
var training = s2.select(bands).addBands(ndvi).addBands(savi).sample({
  region: geometry,
  scale: 10,
  numPixels: 5000,
  seed: 42,
  geometries: true
});

// Number of clusters
var numClusters = 5;

// Training of K-Means classifier and applying classifier on selected image
var clusterer = ee.Clusterer.wekaKMeans(numClusters).train(training);
var classified = s2.select(bands).addBands(ndvi).addBands(savi).cluster(clusterer);

// Define color pallete for clusters
var palette = ['brown', 'green', 'yellow', 'magenta', 'cyan'];

// Calculation of the area of clusters
var areaImage = ee.Image.pixelArea().addBands(classified);
var areaTable = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'class'
  }),
  geometry: geometry,
  scale: 10,
  maxPixels: 1e13
});

// Convert areaTable to groups
areaTable.evaluate(function(result) {
  var groups = result.groups;
  print('K-MEANS CLUSTERING RESULTS:');
  
  // Print results into console for each cluster
  groups.forEach(function(group) {
    var classNumber = group.class + 1;
    var areaKm2 = (group.sum / 1000000).toFixed(3);
    print('Class ' + classNumber + ': ' + areaKm2 + ' km²');
  });
  print('---------------------------------------');
});


/*###################################################################################################################*/
/* 3) SUPERVISED CLASSIFICATION
/*###################################################################################################################*/

// Random Forest Classification

// Defining training data - manually created areas for each class
var trainingPolygons = ee.FeatureCollection([
  ee.Feature(urbanGeometry, {'class': 0}),        // Les
  ee.Feature(urbanGeometry, {'class': 1}),         // Mesto
  ee.Feature(waterGeometry, {'class': 2}),         // Voda
  ee.Feature(greeneryGeometry, {'class': 3}),   // Poľnohospodárska pôda
  ee.Feature(agriSoilGeometry, {'class': 4})       // Holá pôda / skalnaté územie
]);

// Add NDVI and SAVI to input bands
var rfBands = bands.concat(['NDVI', 'SAVI']);
var rfImage = s2.select(bands).addBands(ndvi).addBands(savi);

// Sample from the image
var rfTraining = rfImage.select(rfBands).sampleRegions({
  collection: trainingPolygons,
  properties: ['class'],
  scale: 10
});

// Train the Random Forest classifier
var rfClassifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 50,
  variablesPerSplit: null,
  minLeafPopulation: 1,
  bagFraction: 0.5,
  maxNodes: null,
  seed: 0
}).train({
  features: rfTraining,
  classProperty: 'class',
  inputProperties: rfBands
});

// Apply classifier to the image
var classifiedRF = rfImage.select(rfBands).classify(rfClassifier);

// Calculate areas for Random Forest
var rfAreaImage = ee.Image.pixelArea().addBands(classifiedRF);
var rfAreaTable = rfAreaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'class'
  }),
  geometry: geometry,
  scale: 10,
  maxPixels: 1e13
});

rfAreaTable.evaluate(function(result) {
  var groups = result.groups;
  var classNames = ['Forest', 'Urban', 'Water', 'Agricultural land', 'Bare soil'];
  print('RANDOM FOREST CLASSIFICATION RESULTS:');
  
  groups.forEach(function(group) {
    var className = classNames[group.class];
    var areaKm2 = (group.sum / 1000000).toFixed(3);
    print(className + ': ' + areaKm2 + ' km²');
  });
  
  // Calculate classification accuracy
  var validation = rfClassifier.confusionMatrix();
  print('Overall Accuracy:', validation.accuracy());
  print('Confusion Matrix:', validation);
  print('Kappa Coefficient:', validation.kappa());
});


/*###################################################################################################################*/
/* 4) RESULTS VISUALIZATION
/*###################################################################################################################*/

// Add NDVI and SAVI masks into the map
Map.addLayer(transparentNdviMask, {min: 0, max: 1, palette: ['green']}, 'Transparent NDVI Mask');
Map.addLayer(transparentSaviMask, {min: 0, max: 1, palette: ['yellow']}, 'Transparent SAVI Mask');

// Add K-Means Clustering results into the map
Map.addLayer(classified, {min: 0, max: numClusters - 1, palette: palette}, 'K-Means Clustering');

// Random Forest vizualizácia
Map.addLayer(classifiedRF, {
  min: 0,
  max: 4,
  palette: [
    '0c8900', // 0 - Les (zelená)
    'c4281b', // 1 - Mesto (červená)
    '0046c8', // 2 - Voda (modrá)
    'ffe82b', // 3 - Poľnohospodárska pôda (žltá)
    'a17f4a'  // 4 - Holá pôda / skaly (hnedá)
  ]
}, 'Random Forest Classification');

// 5) EXPORT OF FINAL IMAGES
/*Export.image.toDrive({
  image: classified,
  description: 'K-Means',
  scale: 10,
  region: geometry,
  crs: 'EPSG:32634',
  maxPixels:5000000000,
  fileFormat:'GeoTIFF',
}); 
*/
