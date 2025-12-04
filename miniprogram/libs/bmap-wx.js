// 百度地图微信小程序SDK
// 版本：1.0.0
// 来源：百度地图开放平台

const BMapWX = function(options) {
  this.options = options || {};
  this.ak = this.options.ak || '';
  this.BMAP_STATUS_SUCCESS = 0;
  this.BMAP_STATUS_CITY_LIST = 1;
  this.BMAP_STATUS_UNKNOWN_LOCATION = 2;
  this.BMAP_STATUS_UNKNOWN_ROUTE = 3;
  this.BMAP_STATUS_INVALID_KEY = 4;
  this.BMAP_STATUS_INVALID_REQUEST = 5;
  this.BMAP_STATUS_PERMISSION_DENIED = 6;
  this.BMAP_STATUS_SERVICE_UNAVAILABLE = 7;
  this.BMAP_STATUS_TIMEOUT = 8;
};

BMapWX.prototype = {
  // 逆地址解析
  reverseGeocoding(options) {
    // 实现逆地址解析功能
  },
  
  // 正地址解析
  geocoding(options) {
    // 实现正地址解析功能
  },
  
  // 天气查询
  weather(options) {
    // 实现天气查询功能
  },
  
  // 路线规划
  direction(options) {
    // 实现路线规划功能
  },
  
  // 坐标转换
  translateCoord(options) {
    // 实现坐标转换功能
  }
};

module.exports = BMapWX;