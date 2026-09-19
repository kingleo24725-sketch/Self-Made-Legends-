class LanguageService {
  constructor() {
    this.supportedLanguages = {
      en: { name: 'English', flag: '🇺🇸', code: 'en-US' },
      es: { name: 'Español', flag: '🇲🇽', code: 'es-MX' },
    };

    this.translations = {
      es: {
        // Common Rider Questions
        'Where are we going?': '¿A dónde vamos?',
        'How long will this take?': '¿Cuánto tiempo tomará?',
        'Can we take a different route?': '¿Podemos tomar una ruta diferente?',
        'Is the air conditioning working?': '¿Funciona el aire acondicionado?',
        'Can you turn down the music?': '¿Puedes bajar la música?',
        'Do you accept card payment?': '¿Aceptas pago con tarjeta?',
        'Can I make a quick stop?': '¿Puedo hacer una parada rápida?',
        'What is your name?': '¿Cuál es tu nombre?',
        'Thank you for the ride': 'Gracias por el viaje',
        'Have a great day': 'Que tengas un gran día',

        // Common Rider Statements
        'I am ready': 'Estoy listo/a',
        'I am in the car': 'Estoy en el auto',
        'I need to cancel': 'Necesito cancelar',
        'The car is uncomfortable': 'El auto es incómodo',
        'The driver is not friendly': 'El conductor no es amable',
        'I will be 5 minutes': 'Seré en 5 minutos',
        'I will be 10 minutes': 'Seré en 10 minutos',

        // Driver Responses
        'Hello, welcome to mogo': 'Hola, bienvenido a mogo',
        'I am on my way': 'Estoy en camino',
        'I am arriving soon': 'Estaré llegando pronto',
        'Thank you for riding with us': 'Gracias por viajar con nosotros',
        'Have a safe trip': 'Ten un viaje seguro',
        'Destination coming up': 'El destino se acerca',
        'Traffic ahead': 'Tráfico adelante',
        'Taking alternate route': 'Tomando una ruta alternativa',

        // Common Interactions
        'Yes': 'Sí',
        'No': 'No',
        'Okay': 'Está bien',
        'Sure': 'Claro',
        'Sorry': 'Lo siento',
        'Excuse me': 'Disculpe',
        'Please': 'Por favor',
        'Help': 'Ayuda',
        'Emergency': 'Emergencia',
      },
    };

    this.defaultLanguage = 'en';
  }

  setLanguage(userId, languageCode) {
    if (!this.supportedLanguages[languageCode]) {
      return {
        success: false,
        error: `Language ${languageCode} not supported`,
      };
    }

    return {
      success: true,
      userId,
      language: languageCode,
      details: this.supportedLanguages[languageCode],
    };
  }

  translateToEnglish(spanishText) {
    const translations = this.translations.es;
    for (const [english, spanish] of Object.entries(translations)) {
      if (spanish.toLowerCase() === spanishText.toLowerCase()) {
        return english;
      }
    }
    return spanishText;
  }

  translateToSpanish(englishText) {
    const translations = this.translations.es;
    return translations[englishText] || englishText;
  }

  getAvailableQuestions(language = 'es') {
    if (language === 'es') {
      return {
        questions: [
          '¿A dónde vamos?',
          '¿Cuánto tiempo tomará?',
          '¿Podemos tomar una ruta diferente?',
          '¿Funciona el aire acondicionado?',
          '¿Puedes bajar la música?',
          '¿Aceptas pago con tarjeta?',
          '¿Puedo hacer una parada rápida?',
          '¿Cuál es tu nombre?',
        ],
      };
    }

    return {
      questions: [
        'Where are we going?',
        'How long will this take?',
        'Can we take a different route?',
        'Is the air conditioning working?',
        'Can you turn down the music?',
        'Do you accept card payment?',
        'Can I make a quick stop?',
        'What is your name?',
      ],
    };
  }

  getAvailableStatements(language = 'es') {
    if (language === 'es') {
      return {
        statements: [
          'Estoy listo/a',
          'Estoy en el auto',
          'Necesito cancelar',
          'El auto es incómodo',
          'El conductor no es amable',
          'Seré en 5 minutos',
          'Seré en 10 minutos',
        ],
      };
    }

    return {
      statements: [
        'I am ready',
        'I am in the car',
        'I need to cancel',
        'The car is uncomfortable',
        'The driver is not friendly',
        'I will be 5 minutes',
        'I will be 10 minutes',
      ],
    };
  }

  getSupportedLanguages() {
    return Object.entries(this.supportedLanguages).map(([code, details]) => ({
      code,
      ...details,
    }));
  }
}

module.exports = LanguageService;
