const API = {
  async request(method, url, body) {
    const options = {
      method,
      credentials: 'same-origin',
      headers: {}
    };

    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = data && data.error ? data.error : 'Error de red';
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  get(url) {
    return this.request('GET', url);
  },

  post(url, body) {
    return this.request('POST', url, body);
  },

  put(url, body) {
    return this.request('PUT', url, body);
  },

  del(url) {
    return this.request('DELETE', url);
  }
};
