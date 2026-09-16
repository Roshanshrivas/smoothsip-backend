// server/middleware/maintenance.js
import Settings from '../models/Settings.js';

export const maintenanceMode = async (req, res, next) => {
  try {
    // ─── Skip these paths (always accessible) ──────────
    const skipPaths = [
      '/health',
      '/api/health',
      '/api/auth',      // login, register, refresh
      '/api/users',     // push tokens
      '/api/admin',     // admin panel (admins bypass anyway)
    ];
    
    const isSkipped = skipPaths.some(path => req.path.startsWith(path));
    if (isSkipped) {
      return next();
    }

    // ─── Check maintenance status from DB ──────────────
    const settings = await Settings.getSettings();
    
    // If maintenance is OFF, continue normally
    if (!settings.general?.maintenanceMode) {
      return next();
    }

    // ─── MAINTENANCE IS ON ──────────────────────────────
    
    // Allow logged-in admins to bypass
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // For API requests – return 503
    if (req.path.startsWith('/api')) {
      return res.status(503).json({
        success: false,
        message: 'We are currently under maintenance. Please check back later.',
        maintenance: true,
      });
    }

    // For non-API requests – render HTML maintenance page
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Under Maintenance</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              background: #f8fafc;
            }
            .container { 
              text-align: center; 
              max-width: 500px; 
              padding: 48px 32px;
              background: white;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.08);
              margin: 20px;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { font-size: 28px; color: #1e293b; margin-bottom: 12px; font-weight: 700; }
            p { color: #64748b; font-size: 16px; line-height: 1.6; max-width: 400px; margin: 0 auto; }
            .btn {
              display: inline-block;
              margin-top: 24px;
              padding: 12px 32px;
              background: #f97316;
              color: white;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 600;
              border: none;
              cursor: pointer;
              transition: background 0.2s;
            }
            .btn:hover { background: #ea580c; }
            .sub { margin-top: 16px; font-size: 14px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🔧</div>
            <h1>We'll Be Back Soon!</h1>
            <p>Our store is currently undergoing scheduled maintenance. Please check back in a few minutes.</p>
            <a href="/admin" class="btn">Admin Login</a>
            <p class="sub">Estimated time: 5-10 minutes</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Maintenance check failed:', error);
    next(); // Fail open – if DB fails, allow access
  }
};