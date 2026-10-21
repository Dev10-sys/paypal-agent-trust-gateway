export type Context = {
  merchant_id?: string;
  sandbox?: boolean;
  access_token?: string;
  request_id?: string;
  tenant_context?: any;
  debug?: boolean;
  [key: string]: any;
};

export type Configuration = {
  actions: {
    [product: string]: {
      [action: string]: boolean;
    };
  };
  context?: Context;
};
