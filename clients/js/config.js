const API_CONFIG = {
    LOCAL: 'http://localhost:5000',
    PRODUCTION: 'https://legal-lens-backend-ouuu.onrender.com',
    getBaseURL: function() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return this.PRODUCTION;
        }
        return this.LOCAL;
    }
};

const API_URL = API_CONFIG.getBaseURL();

console.log('Using API URL:', API_URL);
