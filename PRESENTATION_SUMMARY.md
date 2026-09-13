# Quick Presentation Summary - Dyslexia Detection System

## 🎯 One-Minute Pitch

**"I built an AI-powered dyslexia screening system that uses eye-tracking and machine learning to identify students at risk - all through a web browser, no special equipment needed."**

---

## 📊 Key Numbers

- **16 Parameters** tracked per assessment
- **1500 Samples** in training dataset  
- **90.5%** - Accuracy is the most important feature
- **Real-time** - Results in seconds
- **100%** - Complete data stored for research

---

## 🔄 How It Works (Simple)

```
Student Takes Assessment
    ↓
We Track: Eye Movements + Answers + Time
    ↓
Extract 16 Features
    ↓
AI Analyzes Patterns
    ↓
Risk Level: Low / Medium / High
```

---

## 📁 File Roles (Quick Reference)

| File | Role |
|------|------|
| `server.py` | Main backend - handles requests, runs detection |
| `ml_detector.py` | ML engine - predicts dyslexia risk |
| `process_gaze.py` | Processes eye-tracking data |
| `train_model.py` | Creates dataset & trains model |
| `assessment.html` | Main assessment page - tracks everything |
| `index.html` | Student registration |
| `dashboard.html` | Shows results to students |

---

## 🧠 Model Information

**Type:** Custom-trained (NOT pre-trained)

**Algorithm:** Gradient Boosting Classifier

**Dataset:** Synthetic (1500 samples) based on research

**Features:** 16 total
- Primary: Accuracy (90.5% importance)
- Secondary: Regressions, Fixations, Reading Speed

**Training:**
- 150 trees
- Learning rate: 0.08
- Preprocessing: StandardScaler + OneHotEncoder

---

## 📈 What Gets Tracked

### Primary Indicators
-  **Accuracy** (score/total) - Most important!
-  **Error Count** - How many wrong
-  **Score** - Raw performance

### Eye Tracking
-  **Fixations** - Where eyes pause (reading)
-  **Saccades** - Eye movements between fixations
-  **Regressions** - Backward movements (re-reading)
-  **Scanpath Entropy** - How organized eye movements are

### Reading Metrics
-  **Reading Speed** (WPM)
-  **Time per Question**
-  **Total Time**

### Demographics
-  Age, Grade, Language, Device Type

---

## 🎯 Detection Logic

1. **Hard Rules First** (Safety Net)
   - 0% accuracy → HIGH RISK (95%)
   - <25% accuracy → HIGH RISK (85%)

2. **ML Prediction**
   - Extract 16 features
   - Run through trained model
   - Get probability (0-1)

3. **Adjust if Needed**
   - If accuracy low but ML says low risk → Boost risk

4. **Final Risk Level**
   - ≥0.7 → HIGH
   - 0.4-0.69 → MEDIUM
   - <0.4 → LOW

---

## 💾 Data Storage

### Sessions (`data/sessions/`)
- **Complete raw data**
- Every gaze point
- All events
- Full audit trail

### Results (`data/results/`)
- **Summary data**
- ML predictions
- Quick access

### CSV (`all_results.csv`)
- **Tabular format**
- For analysis
- Easy to import

---

## 🚀 Future Enhancements

1. Real eye-tracking (WebGazer.js)
2. Audio/speech analysis
3. More assessment types
4. Train on real data
5. Mobile app
6. Analytics dashboard

---

## 💡 Key Points for Presentation

### For Technical Audience:
- "Custom-trained Gradient Boosting model"
- "I-VT algorithm for fixation detection"
- "16 features extracted from assessment"
- "Hard rules ensure safety (0% = HIGH risk)"

### For Non-Technical Audience:
- "AI analyzes reading patterns"
- "Tracks where students look and how they answer"
- "Gives risk level: Low, Medium, or High"
- "Based on research about dyslexia"

---

## ❓ Common Questions

**Q: Is it accurate?**  
A: It's a screening tool, not diagnosis. High risk = recommend professional evaluation.

**Q: What about privacy?**  
A: Data stored securely, only authorized access.

**Q: Can it be used in schools?**  
A: Yes, designed for school use. Web-based, no special equipment.

**Q: Did you use a pre-trained model?**  
A: No, we trained our own model on synthetic data based on research patterns.

**Q: What dataset did you use?**  
A: Synthetic dataset (1500 samples) generated based on dyslexia research patterns.

---

## 📝 Demo Script

1. **Show Registration** - "Student enters details"
2. **Show Calibration** - "Webcam setup"
3. **Show Assessment** - "Questions, tracking in background"
4. **Show Results** - "Risk level, confidence, explanation"
5. **Show Dashboard** - "Student can view their report"
6. **Show Admin** - "View all results, analyze data"

---

## 🎓 Technical Details (If Asked)

- **Backend:** FastAPI (Python)
- **Frontend:** HTML/JavaScript
- **ML:** Scikit-learn Gradient Boosting
- **Algorithm:** I-VT for fixations, regression detection
- **Storage:** JSON (sessions), CSV (analysis)
- **Model:** Custom-trained, 150 trees, 0.08 learning rate

---

**Remember:** This is a screening tool, not a diagnosis. Always recommend professional evaluation for high-risk cases!

