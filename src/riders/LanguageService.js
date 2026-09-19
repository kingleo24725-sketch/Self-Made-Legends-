class LanguageService {
  constructor() {
    this.supportedLanguages = {
      en: { name: 'English', flag: '🇺🇸', code: 'en-US' },
      es: { name: 'Español', flag: '🇲🇽', code: 'es-MX' },
      pt: { name: 'Português', flag: '🇧🇷', code: 'pt-BR' },
      fr: { name: 'Français', flag: '🇫🇷', code: 'fr-FR' },
      zh: { name: '中文', flag: '🇨🇳', code: 'zh-CN' },
      ja: { name: '日本語', flag: '🇯🇵', code: 'ja-JP' },
      ko: { name: '한국어', flag: '🇰🇷', code: 'ko-KR' },
      vi: { name: 'Tiếng Việt', flag: '🇻🇳', code: 'vi-VN' },
      tl: { name: 'Tagalog', flag: '🇵🇭', code: 'tl-PH' },
      de: { name: 'Deutsch', flag: '🇩🇪', code: 'de-DE' },
      it: { name: 'Italiano', flag: '🇮🇹', code: 'it-IT' },
      ru: { name: 'Русский', flag: '🇷🇺', code: 'ru-RU' },
    };

    this.translations = {
      es: {
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
        'I am ready': 'Estoy listo/a',
        'I am in the car': 'Estoy en el auto',
        'I need to cancel': 'Necesito cancelar',
        'The car is uncomfortable': 'El auto es incómodo',
        'The driver is not friendly': 'El conductor no es amable',
        'I will be 5 minutes': 'Seré en 5 minutos',
        'I will be 10 minutes': 'Seré en 10 minutos',
        'Hello, welcome to mogo': 'Hola, bienvenido a mogo',
        'I am on my way': 'Estoy en camino',
        'I am arriving soon': 'Estaré llegando pronto',
        'Thank you for riding with us': 'Gracias por viajar con nosotros',
        'Have a safe trip': 'Ten un viaje seguro',
        'Destination coming up': 'El destino se acerca',
        'Traffic ahead': 'Tráfico adelante',
        'Taking alternate route': 'Tomando una ruta alternativa',
        'Yes': 'Sí', 'No': 'No', 'Okay': 'Está bien', 'Sure': 'Claro',
        'Sorry': 'Lo siento', 'Excuse me': 'Disculpe', 'Please': 'Por favor',
        'Help': 'Ayuda', 'Emergency': 'Emergencia',
      },
      pt: {
        'Where are we going?': 'Para onde vamos?',
        'How long will this take?': 'Quanto tempo vai levar?',
        'Can we take a different route?': 'Podemos pegar uma rota diferente?',
        'Is the air conditioning working?': 'O ar condicionado está funcionando?',
        'Can you turn down the music?': 'Você pode abaixar a música?',
        'Do you accept card payment?': 'Você aceita pagamento em cartão?',
        'Can I make a quick stop?': 'Posso fazer uma parada rápida?',
        'What is your name?': 'Qual é o seu nome?',
        'I am on my way': 'Estou a caminho',
        'I am arriving soon': 'Chegarei em breve',
        'Have a safe trip': 'Tenha uma viagem segura',
        'Thank you for riding with us': 'Obrigado por viajar conosco',
        'Emergency': 'Emergência',
      },
      fr: {
        'Where are we going?': 'Où allons-nous?',
        'How long will this take?': 'Combien de temps cela prendra-t-il?',
        'Can we take a different route?': 'Pouvons-nous prendre une route différente?',
        'Is the air conditioning working?': 'La climatisation fonctionne-t-elle?',
        'Can you turn down the music?': 'Pouvez-vous baisser la musique?',
        'Do you accept card payment?': 'Acceptez-vous le paiement par carte?',
        'Can I make a quick stop?': 'Puis-je faire un arrêt rapide?',
        'I am on my way': 'Je suis en chemin',
        'Emergency': 'Urgence',
      },
      zh: {
        'Where are we going?': '我们去哪里？',
        'How long will this take?': '这需要多长时间？',
        'Can we take a different route?': '我们可以走另一条路吗？',
        'Is the air conditioning working?': '空调工作吗？',
        'Can you turn down the music?': '你能把音乐关小吗？',
        'Do you accept card payment?': '你接受卡付款吗？',
        'I am on my way': '我在路上',
        'Emergency': '紧急情况',
      },
      ja: {
        'Where are we going?': 'どこへ行きますか？',
        'How long will this take?': 'これはどのくらい時間がかかりますか？',
        'Can we take a different route?': '別のルートを取ることができますか？',
        'Do you accept card payment?': 'カード払いは受け付けていますか？',
        'I am on my way': '向かっています',
        'Emergency': '緊急事態',
      },
      ko: {
        'Where are we going?': '우리는 어디로 가고 있나요?',
        'How long will this take?': '이것은 얼마나 오래 걸릴까요?',
        'Can we take a different route?': '다른 경로를 택할 수 있나요?',
        'Do you accept card payment?': '카드 결제를 받으시나요?',
        'I am on my way': '가는 중입니다',
        'Emergency': '긴급',
      },
      vi: {
        'Where are we going?': 'Chúng ta sẽ đi đâu?',
        'How long will this take?': 'Điều này sẽ mất bao lâu?',
        'Can we take a different route?': 'Chúng ta có thể lấy một tuyến đường khác không?',
        'Do you accept card payment?': 'Bạn có chấp nhận thanh toán bằng thẻ không?',
        'I am on my way': 'Tôi đang trên đường',
        'Emergency': 'Tình huống khẩn cấp',
      },
      tl: {
        'Where are we going?': 'Saan tayo pupunta?',
        'How long will this take?': 'Gaano katagal ang ito?',
        'Can we take a different route?': 'Maaari ba tayong kumuha ng ibang ruta?',
        'Do you accept card payment?': 'Tumatanggap ka ba ng pagbabayad ng kard?',
        'I am on my way': 'Papunta na ako',
        'Emergency': 'Emergency',
      },
      de: {
        'Where are we going?': 'Wohin gehen wir?',
        'How long will this take?': 'Wie lange wird das dauern?',
        'Do you accept card payment?': 'Akzeptieren Sie Kartenzahlung?',
        'I am on my way': 'Ich bin unterwegs',
        'Emergency': 'Notfall',
      },
      it: {
        'Where are we going?': 'Dove stiamo andando?',
        'How long will this take?': 'Quanto tempo ci vorrà?',
        'Do you accept card payment?': 'Accetti il pagamento con carta?',
        'I am on my way': 'Sono in arrivo',
        'Emergency': 'Emergenza',
      },
      ru: {
        'Where are we going?': 'Куда мы идём?',
        'How long will this take?': 'Сколько времени это займет?',
        'Do you accept card payment?': 'Вы принимаете платежи по карте?',
        'I am on my way': 'Я в пути',
        'Emergency': 'Чрезвычайная ситуация',
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
