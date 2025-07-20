// utils/cookiesToCurlString.js
module.exports = function cookiesToCurlString(cookies) {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  };
  