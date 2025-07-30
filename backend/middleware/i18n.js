// middlewares/i18n.js
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'zh', 'fr', 'de', 'es', 'ru'],
    supportedLngs: ['en', 'it', 'zh', 'fr', 'de', 'es', 'ru'], // ✅ add this line
    backend: {
      loadPath: path.join(__dirname, '..', 'locales', '{{lng}}.json'),
    }
  });


module.exports = middleware.handle(i18next);
