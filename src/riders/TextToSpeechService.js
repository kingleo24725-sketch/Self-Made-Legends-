class TextToSpeechService {
  constructor() {
    this.voices = {
      en: {
        male: { lang: 'en-US', name: 'English Male' },
        female: { lang: 'en-US', name: 'English Female' },
      },
      es: {
        male: { lang: 'es-MX', name: 'Spanish (Mexico) Male' },
        female: { lang: 'es-MX', name: 'Spanish (Mexico) Female' },
      },
      pt: {
        male: { lang: 'pt-BR', name: 'Portuguese (Brazil) Male' },
        female: { lang: 'pt-BR', name: 'Portuguese (Brazil) Female' },
      },
      fr: {
        male: { lang: 'fr-FR', name: 'French Male' },
        female: { lang: 'fr-FR', name: 'French Female' },
      },
      zh: {
        male: { lang: 'zh-CN', name: 'Chinese (Mandarin) Male' },
        female: { lang: 'zh-CN', name: 'Chinese (Mandarin) Female' },
      },
      ja: {
        male: { lang: 'ja-JP', name: 'Japanese Male' },
        female: { lang: 'ja-JP', name: 'Japanese Female' },
      },
      ko: {
        male: { lang: 'ko-KR', name: 'Korean Male' },
        female: { lang: 'ko-KR', name: 'Korean Female' },
      },
      vi: {
        male: { lang: 'vi-VN', name: 'Vietnamese Male' },
        female: { lang: 'vi-VN', name: 'Vietnamese Female' },
      },
      tl: {
        male: { lang: 'tl-PH', name: 'Tagalog Male' },
        female: { lang: 'tl-PH', name: 'Tagalog Female' },
      },
      de: {
        male: { lang: 'de-DE', name: 'German Male' },
        female: { lang: 'de-DE', name: 'German Female' },
      },
      it: {
        male: { lang: 'it-IT', name: 'Italian Male' },
        female: { lang: 'it-IT', name: 'Italian Female' },
      },
      ru: {
        male: { lang: 'ru-RU', name: 'Russian Male' },
        female: { lang: 'ru-RU', name: 'Russian Female' },
      },
    };

    this.speechSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    this.isSupported = this.checkBrowserSupport();
  }

  checkBrowserSupport() {
    return (
      typeof window !== 'undefined' &&
      (window.speechSynthesis ||
        window.webkitSpeechSynthesis ||
        window.mozSpeechSynthesis ||
        window.msSpeechSynthesis)
    );
  }

  async convertTextToSpeech(text, options = {}) {
    const {
      language = 'en-US',
      voicePreference = 'female',
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
      onStart = null,
      onEnd = null,
      onError = null,
    } = options;

    if (!this.isSupported) {
      return {
        success: false,
        error: 'Speech synthesis not supported in this browser',
        fallbackMessage: `Driver should hear: "${text}"`,
      };
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (onEnd) onEnd();
        resolve({
          success: true,
          text,
          language,
          voicePreference,
          duration: `~${Math.ceil(text.split(' ').length * 0.5)} seconds`,
        });
      };

      utterance.onerror = (event) => {
        const errorMessage = `Speech synthesis error: ${event.error}`;
        if (onError) onError(event.error);
        reject({
          success: false,
          error: errorMessage,
          fallbackMessage: `Driver should hear: "${text}"`,
        });
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stopSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      return { success: true, message: 'Speech stopped' };
    }
    return { success: false, error: 'Speech synthesis not available' };
  }

  pauseSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        return { success: true, message: 'Speech resumed' };
      } else {
        window.speechSynthesis.pause();
        return { success: true, message: 'Speech paused' };
      }
    }
    return { success: false, error: 'Speech synthesis not available' };
  }

  getAvailableVoices(language = 'en') {
    return this.voices[language] || this.voices['en'];
  }

  setSpeechSettings(settings = {}) {
    this.speechSettings = {
      rate: settings.rate || this.speechSettings.rate,
      pitch: settings.pitch || this.speechSettings.pitch,
      volume: settings.volume || this.speechSettings.volume,
    };
    return this.speechSettings;
  }

  generateAudioVisualization(text) {
    const wordCount = text.split(' ').length;
    const estimatedDuration = wordCount * 0.5;
    const waveform = this.generateWaveform(estimatedDuration);

    return {
      text,
      estimatedDuration: `${estimatedDuration.toFixed(1)}s`,
      wordCount,
      waveform,
      visualization: this.createVisualization(wordCount),
    };
  }

  generateWaveform(duration) {
    const samples = Math.ceil(duration * 50);
    const waveform = [];
    for (let i = 0; i < samples; i++) {
      waveform.push(Math.sin((i / samples) * Math.PI * 4) * 0.5 + 0.5);
    }
    return waveform;
  }

  createVisualization(wordCount) {
    const bars = Math.min(wordCount * 2, 50);
    const visualization = [];
    for (let i = 0; i < bars; i++) {
      visualization.push(Math.random() * 100);
    }
    return visualization;
  }
}

module.exports = TextToSpeechService;
