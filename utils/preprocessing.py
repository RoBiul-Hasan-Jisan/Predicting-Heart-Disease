import pickle
import logging
from typing import Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)

class ModelLoader:
    """Handle model loading with error handling"""
    
    def __init__(self, model_path: str, scaler_path: str):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.model = None
        self.scaler = None
        self._load_models()
    
    def _load_models(self) -> None:
        """Load pickle files with error handling"""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            logger.info(f"Model loaded successfully from {self.model_path}")
        except FileNotFoundError:
            logger.error(f"Model file not found: {self.model_path}")
            raise
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
        
        try:
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            logger.info(f"Scaler loaded successfully from {self.scaler_path}")
        except FileNotFoundError:
            logger.error(f"Scaler file not found: {self.scaler_path}")
            raise
        except Exception as e:
            logger.error(f"Error loading scaler: {str(e)}")
            raise
    
    def predict(self, features: np.ndarray) -> Tuple[int, float]:
        """Make prediction with error handling"""
        try:
            # Scale features
            scaled_features = self.scaler.transform(features)
            
            # Make prediction
            prediction = int(self.model.predict(scaled_features)[0])
            probability = float(self.model.predict_proba(scaled_features)[0][1])
            
            logger.info(f"Prediction made: {prediction}, Probability: {probability:.4f}")
            return prediction, probability
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise