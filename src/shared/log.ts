export const captureMessage = async (message: string, params: {[key in string]: any} = {}) => {
  if (!__DEV__) {
    return;
  }
  const finalMessage = message.replace(/\n/g, '');
  const finalParams = params;
  console.log(finalMessage, finalParams);
};

export const captureException = async (message: string, error: any, params: {[key in string]: any} = {}) => {
  if (!__DEV__) {
    return;
  }
  const finalMessage = `Error: ${message}`.replace(/\n/g, '');
  const finalParams = {
    ...params,
    error: {
      message: error && error.message,
      error,
    },
  };
  console.log(finalMessage, finalParams);
};
