const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();

const VALIDATION_SECRET = process.env.VALIDATION_SECRET || 'zalyst-secure-validation-2024-secret-key-advanced-protection-system';
const API_KEY = 'NASGOR-ZEYAN10';
const TOKENS_FILE = process.env.TOKENS_FILE || '/tmp/api-tokens.json';

const AUTH_USERS = {
    'ZeyanAhay': 'Zeyan1&'
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authMiddleware = basicAuth({
    users: AUTH_USERS,
    challenge: true,
    realm: 'Zalyst Token Server',
    unauthorizedResponse: (req) => {
        return {
            error: 'Unauthorized',
            message: 'Authentication required to access this resource'
        };
    }
});

const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey === API_KEY) {
        return next();
    }
    
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key'
    });
};

function loadTokens() {
    try {
        if (!fs.existsSync(TOKENS_FILE)) {
            const defaultTokens = { tokens: [], createdAt: new Date().toISOString() };
            fs.writeFileSync(TOKENS_FILE, JSON.stringify(defaultTokens, null, 2));
            return [];
        }
        const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        return data.tokens || [];
    } catch (error) {
        return [];
    }
}

function saveTokens(tokens) {
    try {
        const data = {
            tokens,
            updatedAt: new Date().toISOString(),
            totalTokens: tokens.length
        };
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

class EncryptedResponseSystem {
    constructor(secretKey) {
        this.secretKey = crypto.createHash('sha512').update(secretKey).digest();
    }

    generateEncryptedResponse(data) {
        try {
            const timestamp = Date.now();
            const payload = {
                data: data,
                timestamp: timestamp,
                version: '2.0.2'
            };

            const signature = crypto
                .createHmac('sha512', this.secretKey)
                .update(timestamp + JSON.stringify(data))
                .digest('hex');

            return {
                signature: signature,
                timestamp: timestamp,
                data: payload,
                encrypted: true
            };
        } catch (error) {
            return this.generateErrorResponse('ENCRYPTION_FAILED');
        }
    }

    validateEncryptedRequest(request) {
        try {
            if (!request || typeof request !== 'object') {
                return { valid: false, error: 'INVALID_REQUEST_FORMAT' };
            }

            if (!request.signature || !request.timestamp || !request.data) {
                return { valid: false, error: 'MISSING_REQUIRED_FIELDS' };
            }

            const now = Date.now();
            if (Math.abs(now - request.timestamp) > 30000) {
                return { valid: false, error: 'TIMESTAMP_EXPIRED' };
            }

            const expectedSignature = crypto
                .createHmac('sha512', this.secretKey)
                .update(request.timestamp + JSON.stringify(request.data))
                .digest('hex');

            const requestSigBuffer = Buffer.from(request.signature, 'hex');
            const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

            if (requestSigBuffer.length !== expectedSigBuffer.length) {
                return { valid: false, error: 'SIGNATURE_LENGTH_MISMATCH' };
            }

            if (!crypto.timingSafeEqual(requestSigBuffer, expectedSigBuffer)) {
                return { valid: false, error: 'INVALID_SIGNATURE' };
            }

            return { valid: true, data: request.data };
        } catch (error) {
            return { valid: false, error: 'VALIDATION_FAILED' };
        }
    }

    generateErrorResponse(errorCode) {
        return this.generateEncryptedResponse({
            valid: false,
            error: errorCode
        });
    }
}

const encryptionSystem = new EncryptedResponseSystem(VALIDATION_SECRET);

app.get('/', authMiddleware, (req, res) => {
    const tokens = loadTokens();
    res.json({
        status: 'Active',
        message: '🚀 Zalyst Token Validator Server',
        version: '2.0.2',
        security: 'Encrypted + API Key Protected',
        total_tokens: tokens.length,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.post('/validate-token', apiKeyMiddleware, (req, res) => {
    try {
        if (req.body.signature && req.body.timestamp && req.body.data) {
            return handleEncryptedValidation(req, res);
        }
        return res.status(400).json({ error: 'Invalid request format' });
    } catch (error) {
        const errorResponse = encryptionSystem.generateErrorResponse('SERVER_ERROR');
        res.status(500).json(errorResponse);
    }
});

function handleEncryptedValidation(req, res) {
    const validationResult = encryptionSystem.validateEncryptedRequest(req.body);

    if (!validationResult.valid) {
        const errorResponse = encryptionSystem.generateErrorResponse(validationResult.error);
        return res.status(400).json(errorResponse);
    }

    const { token } = validationResult.data;

    if (!token) {
        const errorResponse = encryptionSystem.generateErrorResponse('MISSING_REQUIRED_FIELDS');
        return res.status(400).json(errorResponse);
    }

    const tokens = loadTokens();
    const isValid = tokens.includes(token);

    const responseData = {
        valid: isValid,
        checkedAt: new Date().toISOString()
    };

    const encryptedResponse = encryptionSystem.generateEncryptedResponse(responseData);
    res.json(encryptedResponse);
}

app.post('/add-token', authMiddleware, (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
        if (!tokenRegex.test(token)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        const tokens = loadTokens();

        if (tokens.includes(token)) {
            return res.status(400).json({
                success: false,
                message: 'Token already exists'
            });
        }

        tokens.push(token);
        const saveResult = saveTokens(tokens);

        if (saveResult) {
            res.json({
                success: true,
                message: 'Token added successfully',
                total_tokens: tokens.length
            });
        } else {
            throw new Error('Failed to save tokens');
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add token'
        });
    }
});

app.delete('/delete-token', authMiddleware, (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const tokens = loadTokens();

        if (!tokens.includes(token)) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        const updatedTokens = tokens.filter(t => t !== token);
        const saveResult = saveTokens(updatedTokens);

        if (saveResult) {
            res.json({
                success: true,
                message: 'Token deleted successfully',
                total_tokens: updatedTokens.length
            });
        } else {
            throw new Error('Failed to update tokens');
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete token'
        });
    }
});

app.get('/list-tokens', authMiddleware, (req, res) => {
    try {
        const tokens = loadTokens();

        const maskedTokens = tokens.map(token => {
            return {
                masked: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
                length: token.length
            };
        });

        res.json({
            success: true,
            tokens: maskedTokens,
            total_tokens: tokens.length,
            server_time: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to list tokens'
        });
    }
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 ZALYST TOKEN SERVER v2.0.2');
    console.log('='.repeat(60));
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`🔐 Tokens: ${loadTokens().length}`);
    console.log(`🛡️ Security: ENCRYPTED + API KEY + BASIC AUTH`);
    console.log(`👤 Username: ZeyanAhay`);
    console.log(`🔑 API Key: ${API_KEY}`);
    console.log('='.repeat(60));
});
