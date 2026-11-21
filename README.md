# GIDAL
**G**eospatial **I**ndicators of **D**ynamic **A**gricultural **L**andscapes

⚠️ This repository is currently under development. The code and documentation are being prepared. More details will be available soon. ⚠️

This repository contains the code used in the research article:  
**"An Integrated Spectral–Machine Learning Framework for Spatiotemporal Agricultural Vegetation Change Assessment"** on adress: (to be added after article acceptance)

## 🔍 Description

GIDAL provides an integrated workflow for assessing spatiotemporal agricultural vegetation changes using Sentinel-2 satellite imagery, spectral indices, and machine learning techniques. The repository focuses on four conflict-affected districts in eastern and southern Ukraine: Kramatorskyi, Pokrovskyi, Polohivskyi, and Volnovaskyi.

The workflow combines:
- Sentinel-2 Level-2A imagery and cloud masking,
- extraction of spectral indices (NDVI, SAVI, BSI, and NDWI),
- unsupervised classification using K-means clustering,
- supervised classification using Random Forest and Support Vector Machine,
- classification performance assessment using OA, Cohen's Kappa, and Macro-F1,
- seasonal agricultural vegetation monitoring (April–September 2024),
- interannual vegetation change assessment (2020–2025),
- generation of thematic maps and statistical outputs.

The scripts is implemented in Python, with Google Earth Engine used in the initial development stages.

![image](https://github.com/user-attachments/assets/5a964b5a-75bc-4014-82e2-02164b7655c2)

Figure - Spatial distribution of agricultural surface classes and classifier disagreement among RF, SVM, and GTB in the Volnovaskyi district (July 2024)

## 🛰️ Data Sources

- **Sentinel-2 Level-2A (surface reflectance)** – Copernicus Programme, accessed through Google Earth Engine and the Copernicus Data Space Ecosystem.
- **Sentinel-2 Scene Classification Layer (SCL)** – cloud and invalid-pixel masking.
- **Study areas** – Kramatorskyi, Pokrovskyi, Polohivskyi, and Volnovaskyi districts, Ukraine.
- **Temporal coverage** – April–September 2024 (seasonal analysis) and July 2020–2025 (interannual analysis).

## ⚙️ Methodology Overview

- Acquire and preprocess Sentinel-2 Level-2A imagery with SCL-based cloud masking.
- Calculate spectral indices (NDVI, SAVI, BSI, and NDWI).
- Generate seasonal and interannual spectral composites.
- Define four rule-based pseudo-reference land-cover classes.
- Apply K-means, Random Forest, and SVM classification algorithms.
- Assess classification agreement using OA, Cohen's kappa, and Macro-F1.
- Analyze agricultural vegetation dynamics and export thematic maps.

## 📁 Structure

TBA

## ▶️ How to Use

TBA 

## 📊 Outputs

- Thematic maps of agricultural vegetation and land-cover classes.
- Seasonal spectral index maps (April–September 2024).
- Interannual vegetation change maps (2020–2025).
- Classification performance metrics (OA, Cohen's kappa, and Macro-F1).
- Statistical summaries and CSV files for further analysis.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Citation

If you use this script or data in your research, please cite the corresponding publication:
- Kseňak, Ľ. et. al. TBA

## 📬 Contact

For questions or collaboration, contact:  
**Dr. Ľubomír Kseňak**  
Technical university of Košice, Slovakia  
lubomir.ksenak@tuke.sk
