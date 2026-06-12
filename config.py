import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Session configuration
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    
    # Rate limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_DEFAULT = "100/hour"
    RATELIMIT_STORAGE_URL = "memory://"
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = 'logs/app.log'
    
    # Model paths
    MODEL_PATH = 'models/model.pkl'
    SCALER_PATH = 'models/scaler.pkl'
    
    # Feature names for validation
    FEATURE_NAMES = [
        'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
        'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
    ]
    
    # Clinical ranges for validation
    CLINICAL_RANGES = {
        'age': (1, 120),
        'trestbps': (80, 250),
        'chol': (100, 600),
        'thalach': (60, 250),
        'oldpeak': (0.0, 10.0)
    }

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SESSION_TYPE = 'redis'
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SESSION_TYPE = 'filesystem'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}