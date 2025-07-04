from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os

app = Flask(__name__, 
            static_folder='../static', 
            template_folder='../templates')
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)