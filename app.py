import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, jsonify, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from prometheus_flask_exporter import PrometheusMetrics
import structlog
import os
from datetime import datetime

from config import config
from utils.validators import ClinicalValidator, FeatureProcessor
from utils.preprocessing import ModelLoader

# Initialize Flask app
app = Flask(__name__)
env = os.environ.get('FLASK_ENV', 'default')
app.config.from_object(config[env])

# Initialize extensions
csrf = CSRFProtect(app)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[app.config['RATELIMIT_DEFAULT']]
)
limiter.init_app(app)

metrics = PrometheusMetrics(app)

# Setup structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()

# File logging handler
if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Heart Disease Flask app startup')

# Initialize model
model_loader = ModelLoader(
    model_path=app.config['MODEL_PATH'],
    scaler_path=app.config['SCALER_PATH']
)

# Routes
@app.route('/')
@limiter.limit("100/hour")
def index():
    """Home page with prediction form"""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
@csrf.exempt  # Use proper CSRF in production with forms
@limiter.limit("50/hour")
def predict():
    """Handle prediction request"""
    try:
        # Get form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        # Validate input
        is_valid, error_msg = ClinicalValidator.validate_input(data)
        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}", extra={'data': data})
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Prepare features
        features = FeatureProcessor.prepare_features(data)
        
        # Make prediction
        prediction, probability = model_loader.predict(features)
        
        # Log prediction
        logger.info(
            "Prediction made",
            extra={
                'prediction': prediction,
                'probability': probability,
                'session_id': session.get('session_id', 'unknown')
            }
        )
        
        # Return result
        if request.is_json:
            return jsonify({
                'success': True,
                'prediction': int(prediction),
                'probability': float(probability),
                'risk_level': 'HIGH' if prediction == 1 else 'LOW',
                'message': 'Heart disease detected' if prediction == 1 else 'No heart disease detected'
            })
        else:
            return render_template('result.html', 
                                 prediction=prediction,
                                 probability=probability)
    
    except KeyError as e:
        logger.error(f"Missing field in prediction request: {str(e)}")
        return jsonify({'success': False, 'error': f'Missing field: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancers"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'environment': env
    }), 200

@app.route('/metrics', methods=['GET'])
@metrics.do_not_track()
def metrics_endpoint():
    """Prometheus metrics endpoint"""
    return metrics.export_metrics()

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(429)
def ratelimit_error(error):
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)