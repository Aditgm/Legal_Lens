const translate = require('translate-google');
const translationCache = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_STATS = { hits: 0, misses: 0 };
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'hi': 'Hindi',
  'mr': 'Marathi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'bn': 'Bengali',
  'gu': 'Gujarati',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'pa': 'Punjabi'
};
function detectLanguage(text) {
  const hindiPattern = /[\u0900-\u097F]/;
  const marathiPattern = /[\u0900-\u097F]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  const bengaliPattern = /[\u0980-\u09FF]/;
  const gujaratiPattern = /[\u0A80-\u0AFF]/;
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  const malayalamPattern = /[\u0D00-\u0D7F]/;
  const punjabiPattern = /[\u0A00-\u0A7F]/;

  if (hindiPattern.test(text) || marathiPattern.test(text)) {
    return 'hi';
  } else if (tamilPattern.test(text)) {
    return 'ta';
  } else if (teluguPattern.test(text)) {
    return 'te';
  } else if (bengaliPattern.test(text)) {
    return 'bn';
  } else if (gujaratiPattern.test(text)) {
    return 'gu';
  } else if (kannadaPattern.test(text)) {
    return 'kn';
  } else if (malayalamPattern.test(text)) {
    return 'ml';
  } else if (punjabiPattern.test(text)) {
    return 'pa';
  }
  
  return 'en';
}
async function translateText(text, from, to) {
  try {
    if (from === to) {
      return text;
    }

    // Check cache first
    const cacheKey = `${text}_${from}_${to}`;
    if (translationCache.has(cacheKey)) {
      CACHE_STATS.hits++;
      const hitRate = ((CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses)) * 100).toFixed(1);
      console.log(`✅ Cache hit (${hitRate}% hit rate) - ${from} → ${to}`);
      return translationCache.get(cacheKey);
    }

    // Translate and cache
    CACHE_STATS.misses++;
    console.log(`🌐 Translating from ${from} to ${to}...`);
    const result = await translate(text, { from, to });
    translationCache.set(cacheKey, result);
    if (translationCache.size > CACHE_MAX_SIZE) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
      console.log(`🗑️ Cache evicted oldest entry (size: ${translationCache.size})`);
    }
    
    return result;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Translation failed');
  }
}
async function translateToEnglish(text, sourceLanguage = null) {
  try {
    const detectedLang = sourceLanguage || detectLanguage(text);
    
    if (detectedLang === 'en') {
      return { text, detectedLanguage: 'en' };
    }

    const translatedText = await translateText(text, detectedLang, 'en');
    return {
      text: translatedText,
      detectedLanguage: detectedLang
    };
  } catch (error) {
    console.error('Error translating to English:', error);
    return { text, detectedLanguage: 'en' };
  }
}
async function translateFromEnglish(text, targetLanguage) {
  try {
    if (targetLanguage === 'en') {
      return text;
    }

    return await translateText(text, 'en', targetLanguage);
  } catch (error) {
    console.error('Error translating from English:', error);
    return text;
  }
}

module.exports = {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translateText,
  translateToEnglish,
  translateFromEnglish,
  getCacheStats: () => ({
    size: translationCache.size,
    maxSize: CACHE_MAX_SIZE,
    hits: CACHE_STATS.hits,
    misses: CACHE_STATS.misses,
    hitRate: CACHE_STATS.hits + CACHE_STATS.misses > 0 
      ? ((CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses)) * 100).toFixed(2) + '%'
      : '0%'
  }),
  clearCache: () => {
    const size = translationCache.size;
    translationCache.clear();
    CACHE_STATS.hits = 0;
    CACHE_STATS.misses = 0;
    console.log(`🗑️ Cleared translation cache (${size} entries)`);
  }
};
