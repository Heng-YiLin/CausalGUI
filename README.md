# CausalGUI  
**Exploratory New GUI for Editing and Analysing Causal Loop Diagrams (CLDs)**  
*Author: Heng-Yi Lin — Bachelor of Software Engineering (Honours) Thesis, The University of Queensland*  
*Supervised by: Professor Mark Utting and Dr. Adam Hulme*
*School of Eletrical Engineering and Computer Science (ITEE)*

---

## Project Overview  

**CausalGUI** is an interactive web-based application designed to support **qualitative system dynamics** analysis through the **QSEM (Qualitative Systems Exploration Model)** framework supported by Dr. Hulme.

The tool bridges the gap between qualitative diagramming and quantitative modelling by providing a structured interface for:  
- Constructing **Causal Loop Diagrams (CLDs)** interactively  
- Analysing **feedback loops**, **nodes**, and **factor classifications**  
- Performing **semi-quantitative** analysis such as impact and control mapping  
- Integrating QSEM analytical tools such as the **Direct Dependency Matrix (DDM)**, **Loop of Interest (LOI)**, and **Factor Classification Graphs**

Developed using **React**, CausalGUI serves as an **experimental GUI prototype** exploring how researchers and practitioners can transition from qualitative reasoning to more formalised system understanding.

This project was developed as part of final-year thesis project.

---

## Key Features  

| Feature | Description |
|----------|--------------|
| **Interactive CLD Editor** | Create, connect, and organise system factors with directed causal links as well as editing and implementing edge control and impact values. |
| **Loop Detection** | Automatically identifies and classifies feedback loops as *Reinforcing (R)* or *Balancing (B)*. |
| **Impact & Control Calculations** | Dynamically computes active/passive impact and control values for each factor which assit with QSEM analysis. |
| **Direct Dependency Matrix (DDM)** | Tabular representation of factor relationships with editable influence weights. |
| **Factor Classification Graph** | Visual categorisation of factors into *Steering*, *Autonomous*, *Ambivalent*, and *Measuring* classes. |
| **Loop of Interest (LOI) Analysis** | Quantitative weighting and ranking of feedback loops based on user-defined coefficients. |
| **Local Storage Persistence** | Automatically saves models locally in browser for offline work and quick iteration. |
| **Export & Import** | Supports data export/import for research reproducibility and sharing. |

---

## Main Technology Stack  

| Category | Tools |
|-----------|-------|
| **Frontend Framework** | React, Vite, JavaScript |
| **Main Libraries** | React Flow, AG Grid, Recharts |
| **Data Management** | React LocalStorage |
| **UI Styling** | TailwindCSS |

---

## Getting Started  

### 1. Clone the Repository  
```bash
git clone https://github.com/Heng-YiLin/CausalGUI
cd CausalGUI

### 2. Install dependencies
```bash
npm install

### 3. Start Development server
This will launch Vite development server. To connect open the provided Vite local host URL
(typically http://localhost:5173) in your browser

```bash
npm run dev


## Contact

Heng-Yi (Henry) Lin
Email: henrylin1207@gmail.com
LinkedIn:  https://www.linkedin.com/in/hengyi-lin/
GitHub: https://github.com/Heng-YiLin
