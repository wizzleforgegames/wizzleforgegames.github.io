/* MD5 — чистая реализация (для подписи счёта Robokassa в браузере).
   MD5('abc') = 900150983cd24fb0d6963f7d28e17f72 */
var MD5 = (function () {
  var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
           5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
           4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
           6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var K = new Uint32Array(64);
  for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  function rotl(x, c) { return ((x << c) | (x >>> (32 - c))) >>> 0; }
  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
  }
  function core(b) {
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (var off = 0; off < b.length; off += 64) {
      var M = new Uint32Array(16);
      for (var j = 0; j < 16; j++)
        M[j] = (b[off + j * 4] | (b[off + j * 4 + 1] << 8) | (b[off + j * 4 + 2] << 16) | (b[off + j * 4 + 3] << 24)) >>> 0;
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + rotl(F, S[i])) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return [a0, b0, c0, d0];
  }
  return function (str) {
    var b = utf8(str), len = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    var lo = len >>> 0, hi = Math.floor(len / 4294967296) >>> 0;
    b.push(lo & 0xff, (lo >>> 8) & 0xff, (lo >>> 16) & 0xff, (lo >>> 24) & 0xff,
           hi & 0xff, (hi >>> 8) & 0xff, (hi >>> 16) & 0xff, (hi >>> 24) & 0xff);
    var h = core(b), hex = '';
    for (var i = 0; i < 4; i++)
      for (var sh = 0; sh < 32; sh += 8)
        hex += ((h[i] >>> sh) & 0xff).toString(16).padStart(2, '0');
    return hex;
  };
})();
