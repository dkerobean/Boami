declare module 'flutterwave-node-v3' {
  interface FlutterwaveConfig {
    public_key: string;
    secret_key: string;
  }

  interface PaymentData {
    tx_ref: string;
    amount: number;
    currency: string;
    redirect_url: string;
    customer: {
      email: string;
      phonenumber?: string;
      name: string;
    };
    customizations?: {
      title?: string;
      description?: string;
      logo?: string;
    };
    payment_options?: string;
    meta?: any;
  }

  interface PaymentResponse {
    status: string;
    message: string;
    data?: {
      link: string;
      [key: string]: any;
    };
  }

  interface TransactionVerificationResponse {
    status: string;
    message: string;
    data?: {
      id: number;
      tx_ref: string;
      flw_ref: string;
      device_fingerprint: string;
      amount: number;
      currency: string;
      charged_amount: number;
      app_fee: number;
      merchant_fee: number;
      processor_response: string;
      auth_model: string;
      ip: string;
      narration: string;
      status: string;
      payment_type: string;
      created_at: string;
      account_id: number;
      customer: {
        id: number;
        name: string;
        phone_number: string;
        email: string;
        created_at: string;
      };
      [key: string]: any;
    };
  }

  class Flutterwave {
    constructor(config: FlutterwaveConfig);

    Payment: {
      initiate(data: PaymentData): Promise<PaymentResponse>;
    };

    Transaction: {
      verify(options: { id: string }): Promise<TransactionVerificationResponse>;
    };
  }

  export = Flutterwave;
}