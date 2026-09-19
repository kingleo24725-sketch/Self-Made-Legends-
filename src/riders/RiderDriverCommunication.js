const LanguageService = require('./LanguageService');
const TextToSpeechService = require('./TextToSpeechService');

class RiderDriverCommunication {
  constructor() {
    this.languageService = new LanguageService();
    this.ttsService = new TextToSpeechService();
    this.communications = [];
    this.conversationHistory = {};
  }

  initializeRider(riderId, preferredLanguage = 'en') {
    const langResult = this.languageService.setLanguage(riderId, preferredLanguage);

    if (!langResult.success) {
      return langResult;
    }

    this.conversationHistory[riderId] = [];

    return {
      success: true,
      riderId,
      language: preferredLanguage,
      languageName: this.languageService.supportedLanguages[preferredLanguage].name,
      availableQuestions: this.languageService.getAvailableQuestions(
        preferredLanguage
      ),
      availableStatements: this.languageService.getAvailableStatements(
        preferredLanguage
      ),
    };
  }

  sendRiderMessage(riderId, message, language = 'es') {
    if (!this.conversationHistory[riderId]) {
      this.conversationHistory[riderId] = [];
    }

    const translatedMessage = this.languageService.translateToEnglish(message);

    const communication = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      riderId,
      originalLanguage: language,
      originalMessage: message,
      translatedMessage,
      timestamp: new Date(),
      direction: 'rider_to_driver',
      read: false,
    };

    this.communications.push(communication);
    this.conversationHistory[riderId].push(communication);

    return {
      success: true,
      communicationId: communication.id,
      riderId,
      originalMessage: message,
      translatedMessage,
      originalLanguage: language,
      translatedLanguage: 'en',
      status: 'sent',
    };
  }

  broadcastToDriver(driverId, communication, voicePreference = 'female') {
    const message = communication.translatedMessage;

    return {
      success: true,
      driverId,
      communicationId: communication.id,
      message,
      originalSpanishMessage: communication.originalMessage,
      language: 'en-US',
      voicePreference,
      readyForSpeech: true,
      instructions: `Driver should hear: "${message}"`,
      textToSpeechOptions: {
        language: 'en-US',
        voicePreference,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
    };
  }

  async speakToDriver(driverId, communication, options = {}) {
    const { voicePreference = 'female', rate = 1.0, pitch = 1.0, volume = 1.0 } =
      options;

    const message = communication.translatedMessage;

    try {
      const speechResult = await this.ttsService.convertTextToSpeech(message, {
        language: 'en-US',
        voicePreference,
        rate,
        pitch,
        volume,
      });

      return {
        success: true,
        driverId,
        communicationId: communication.id,
        originalSpanishMessage: communication.originalMessage,
        englishMessage: message,
        speechResult,
        delivery: 'audio',
      };
    } catch (error) {
      return {
        success: false,
        driverId,
        communicationId: communication.id,
        error: error.error,
        fallback: error.fallbackMessage,
        delivery: 'text',
      };
    }
  }

  sendDriverResponse(driverId, message, riderId) {
    if (!this.conversationHistory[riderId]) {
      this.conversationHistory[riderId] = [];
    }

    const spanishMessage = this.languageService.translateToSpanish(message);

    const communication = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      driverId,
      riderId,
      originalLanguage: 'en',
      originalMessage: message,
      translatedMessage: spanishMessage,
      timestamp: new Date(),
      direction: 'driver_to_rider',
      read: false,
    };

    this.communications.push(communication);
    this.conversationHistory[riderId].push(communication);

    return {
      success: true,
      communicationId: communication.id,
      driverId,
      riderId,
      englishMessage: message,
      spanishMessage,
      status: 'sent_to_rider',
    };
  }

  getConversationHistory(riderId) {
    const history = this.conversationHistory[riderId] || [];

    return {
      riderId,
      messageCount: history.length,
      messages: history.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        originalMessage: msg.originalMessage,
        translatedMessage: msg.translatedMessage,
        timestamp: msg.timestamp,
        read: msg.read,
      })),
    };
  }

  getAvailableResponses(language = 'es') {
    return {
      driverResponses: [
        { en: 'I am on my way', es: 'Estoy en camino' },
        { en: 'I am arriving soon', es: 'Estaré llegando pronto' },
        { en: 'Destination coming up', es: 'El destino se acerca' },
        { en: 'Traffic ahead', es: 'Tráfico adelante' },
        { en: 'Taking alternate route', es: 'Tomando una ruta alternativa' },
        { en: 'Have a safe trip', es: 'Ten un viaje seguro' },
      ],
    };
  }

  markAsRead(communicationId, userId) {
    const comm = this.communications.find((c) => c.id === communicationId);

    if (!comm) {
      return { success: false, error: 'Communication not found' };
    }

    comm.read = true;
    return {
      success: true,
      communicationId,
      userId,
      readAt: new Date(),
    };
  }

  getStatistics() {
    const totalCommunications = this.communications.length;
    const riderToDriver = this.communications.filter(
      (c) => c.direction === 'rider_to_driver'
    ).length;
    const driverToRider = this.communications.filter(
      (c) => c.direction === 'driver_to_rider'
    ).length;
    const unread = this.communications.filter((c) => !c.read).length;

    return {
      totalCommunications,
      riderToDriver,
      driverToRider,
      unread,
      uniqueRiders: Object.keys(this.conversationHistory).length,
      averageMessagesPerRider:
        totalCommunications / Object.keys(this.conversationHistory).length || 0,
    };
  }
}

module.exports = RiderDriverCommunication;
