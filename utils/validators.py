from typing import Dict, Tuple, Any
import numpy as np

class ClinicalValidator:
    """Validate clinical inputs against medical ranges"""
    
    CLINICAL_RANGES = {
        'age': (1, 120, "Age must be between 1 and 120 years"),
        'sex': (0, 1, "Sex must be 0 (Female) or 1 (Male)"),
        'cp': (0, 3, "Chest pain type must be 0-3"),
        'trestbps': (80, 250, "Blood pressure must be between 80-250 mm Hg"),
        'chol': (100, 600, "Cholesterol must be between 100-600 mg/dL"),
        'fbs': (0, 1, "Fasting blood sugar must be 0 or 1"),
        'restecg': (0, 2, "Resting ECG must be 0-2"),
        'thalach': (60, 250, "Heart rate must be between 60-250 bpm"),
        'exang': (0, 1, "Exercise angina must be 0 or 1"),
        'oldpeak': (0.0, 10.0, "Oldpeak must be between 0-10"),
        'slope': (0, 2, "Slope must be 0-2"),
        'ca': (0, 4, "Number of vessels must be 0-4"),
        'thal': (0, 3, "Thal must be 0-3")
    }
    
    @classmethod
    def validate_input(cls, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate all clinical inputs
        Returns: (is_valid, error_message)
        """
        for field, (min_val, max_val, error_msg) in cls.CLINICAL_RANGES.items():
            if field not in data:
                return False, f"Missing field: {field}"
            
            value = data[field]
            if not isinstance(value, (int, float)):
                return False, f"{field} must be a number"
            
            if value < min_val or value > max_val:
                return False, f"{error_msg} (Got: {value})"
        
        return True, "Valid"

class FeatureProcessor:
    """Process and prepare features for model"""
    
    @staticmethod
    def prepare_features(data: Dict) -> np.ndarray:
        """Convert form data to numpy array in correct order"""
        feature_order = [
            'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
            'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
        ]
        
        features = [float(data[field]) for field in feature_order]
        return np.array([features])