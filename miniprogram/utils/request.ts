// utils/request.ts
// 网络请求工具类

// 后端API基础地址（保留占位符，实际使用时替换）
const BASE_URL = '--';

/**
 * 统一网络请求方法
 * @param options 请求配置
 * @returns Promise<string> 格式化的GNGGA字符串
 */
const request = (options: any) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res: any) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          console.error('请求失败:', res.statusCode, res.data);
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err: any) => {
        console.error('网络请求失败:', err);
        reject(err);
      },
      complete: (res: any) => {
        // 可以在这里添加统一的加载状态管理
      }
    });
  });
};

/**
 * API接口集合
 */
const api = {
  /**
   * 获取GPS数据
   * @returns Promise<string> 格式化的GNGGA字符串
   */
  getGPSData: () => request({
    url: '/gps',
    method: 'GET'
  }),
  
  /**
   * 获取激光雷达数据
   * @returns Promise<any> 激光雷达数据对象
   */
  getLidarData: () => request({
    url: '/lidar',
    method: 'GET'
  })
};

// 使用CommonJS模块语法导出
module.exports = {
  request,
  api
};