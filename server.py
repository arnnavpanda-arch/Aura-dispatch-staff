import os
import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = 'aura_dispatch_secret_2026'

# Setup Socket.IO for cross-origin since it can be accessed from different devices
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Connect to MongoDB (lazy - connects on first use)
MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
db = client['agency_db']
state_collection = db['agency_state']

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    try:
        doc = state_collection.find_one({'_id': 'master_state'})
        if doc:
            doc.pop('_id', None)
            emit('initialState', doc)
        else:
            emit('initialState', {})
    except Exception as e:
        print(f'MongoDB error on connect: {e}')
        emit('initialState', {})

@socketio.on('updateState')
def handle_update_state(new_state):
    print('State update received')
    try:
        state_collection.update_one(
            {'_id': 'master_state'},
            {'$set': new_state},
            upsert=True
        )
    except Exception as e:
        print(f'MongoDB error on save: {e}')
    # Broadcast to all OTHER connected clients so their screens update instantly
    emit('stateUpdated', new_state, broadcast=True, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))
    print(f"Starting server on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port)
