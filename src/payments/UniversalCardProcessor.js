const crypto = require("crypto");

class UniversalCardProcessor {
  constructor() {
    this.supportedCards = {
      visa: {
        name: "Visa",
        fee: 0.025,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      mastercard: {
        name: "Mastercard",
        fee: 0.025,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      amex: {
        name: "American Express",
        fee: 0.035,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      discover: {
        name: "Discover",
        fee: 0.025,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      diners: {
        name: "Diners Club",
        fee: 0.03,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      jcb: {
        name: "JCB",
        fee: 0.03,
        processingTime: "Instant",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      unionpay: {
        name: "UnionPay",
        fee: 0.02,
        processingTime: "1-3 hours",
        minAmount: 0.01,
        maxAmount: 100000,
      },
      mir: {
        name: "MIR",
        fee: 0.025,
        processingTime: "1-3 hours",
        minAmount: 0.01,
        maxAmount: 100000,
      },
    };

    this.transactions = [];
    this.bankSupport = {
      "Bank of America": { supported: true, fee: 0.025 },
      "Wells Fargo": { supported: true, fee: 0.025 },
      Chase: { supported: true, fee: 0.025 },
      Citibank: { supported: true, fee: 0.025 },
      "Capital One": { supported: true, fee: 0.025 },
      Discover: { supported: true, fee: 0.025 },
      "American Express": { supported: true, fee: 0.035 },
      Synchrony: { supported: true, fee: 0.025 },
      USAA: { supported: true, fee: 0.025 },
      "Navy Federal": { supported: true, fee: 0.025 },
      Ally: { supported: true, fee: 0.025 },
      LendingClub: { supported: true, fee: 0.025 },
      SoFi: { supported: true, fee: 0.02 },
      Chime: { supported: true, fee: 0.02 },
      Revolut: { supported: true, fee: 0.02 },
      Wise: { supported: true, fee: 0.01 },
      Stripe: { supported: true, fee: 0.025 },
      PayPal: { supported: true, fee: 0.022 },
      Venmo: { supported: true, fee: 0.03 },
      Square: { supported: true, fee: 0.025 },
    };
  }

  detectCardType(cardNumber) {
    const number = cardNumber.replace(/\D/g, "");

    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(number)) return "visa";
    if (/^5[1-5][0-9]{14}$/.test(number)) return "mastercard";
    if (/^3[47][0-9]{13}$/.test(number)) return "amex";
    if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(number)) return "discover";
    if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(number)) return "diners";
    if (/^(?:2131|1800|35\d{3})\d{11}$/.test(number)) return "jcb";
    if (/^62[0-9]{14,17}$/.test(number)) return "unionpay";
    if (/^220[0-4][0-9]{12}$/.test(number)) return "mir";

    return null;
  }

  processCardDeposit(userId, amount, cardType, cardLast4, bankName) {
    if (!this.supportedCards[cardType]) {
      return {
        success: false,
        error: `Card type ${cardType} not supported`,
      };
    }

    const cardInfo = this.supportedCards[cardType];
    const bankInfo = this.bankSupport[bankName];

    if (!bankInfo || !bankInfo.supported) {
      return {
        success: false,
        error: `Bank ${bankName} is not yet supported for ${cardType}`,
      };
    }

    if (amount < cardInfo.minAmount || amount > cardInfo.maxAmount) {
      return {
        success: false,
        error: `Amount must be between $${cardInfo.minAmount} and $${cardInfo.maxAmount}`,
      };
    }

    const fee = amount * cardInfo.fee;
    const netAmount = amount - fee;
    const transactionId = crypto.randomBytes(16).toString("hex");

    const transaction = {
      id: transactionId,
      userId,
      type: "deposit",
      cardType,
      cardLast4,
      bankName,
      amount,
      fee,
      netAmount,
      status: "processing",
      createdAt: new Date(),
    };

    this.transactions.push(transaction);

    setTimeout(() => {
      const txn = this.transactions.find((t) => t.id === transactionId);
      if (txn) {
        txn.status = "completed";
      }
    }, 1000);

    return {
      success: true,
      transactionId,
      cardType: cardInfo.name,
      bankName,
      cardLast4,
      amount,
      fee,
      netAmount,
      processingTime: cardInfo.processingTime,
      status: "processing",
    };
  }

  processCardWithdrawal(userId, amount, cardType, cardLast4, bankName) {
    if (!this.supportedCards[cardType]) {
      return {
        success: false,
        error: `Card type ${cardType} not supported`,
      };
    }

    const cardInfo = this.supportedCards[cardType];
    const bankInfo = this.bankSupport[bankName];

    if (!bankInfo || !bankInfo.supported) {
      return {
        success: false,
        error: `Bank ${bankName} is not supported for withdrawals`,
      };
    }

    const fee = amount * 0.03;
    const netAmount = amount - fee;
    const transactionId = crypto.randomBytes(16).toString("hex");

    const transaction = {
      id: transactionId,
      userId,
      type: "withdrawal",
      cardType,
      cardLast4,
      bankName,
      amount,
      fee,
      netAmount,
      status: "processing",
      createdAt: new Date(),
    };

    this.transactions.push(transaction);

    setTimeout(() => {
      const txn = this.transactions.find((t) => t.id === transactionId);
      if (txn) {
        txn.status = "completed";
      }
    }, 500);

    return {
      success: true,
      transactionId,
      cardType: cardInfo.name,
      bankName,
      cardLast4,
      amount,
      fee,
      netAmount,
      processingTime: "Instant",
      status: "processing",
    };
  }

  getSupportedCards() {
    return Object.keys(this.supportedCards).map((key) => ({
      type: key,
      ...this.supportedCards[key],
    }));
  }

  getSupportedBanks() {
    return Object.keys(this.bankSupport)
      .filter((bank) => this.bankSupport[bank].supported)
      .map((bank) => ({
        name: bank,
        fee: this.bankSupport[bank].fee,
      }));
  }

  getTransaction(transactionId) {
    return this.transactions.find((t) => t.id === transactionId);
  }

  verifyCardSupport(cardType, bankName) {
    const cardSupported = !!this.supportedCards[cardType];
    const bankSupported = this.bankSupport[bankName]?.supported || false;

    return {
      cardSupported,
      bankSupported,
      supported: cardSupported && bankSupported,
      cardInfo: this.supportedCards[cardType],
      bankInfo: this.bankSupport[bankName],
    };
  }
}

module.exports = UniversalCardProcessor;
