// monitor.ts
// 直接获取App实例，不使用泛型，重命名为globalApp避免与其他页面冲突
const globalApp = getApp()
// 引入百度地图SDK
const BMapWX = require('../../libs/bmap-wx.js')
// 引入网络请求工具，重命名为requestApi避免命名冲突
const { api: requestApi } = require('../../utils/request')

// GPS数据接口
interface GPSData {
  time: string
  latitude: string
  latDir: string
  longitude: string
  lonDir: string
  status: string
  satellites: string
  hdop: string
  altitude: string
  geoidHeight: string
}

// 激光雷达点接口
interface LidarPoint {
  angle: number
  distance_mm: number
  intensity: number
}

// 激光雷达数据接口
interface LidarData {
  N: number
  rpm: number
  timestamp: number
  points: LidarPoint[]
  crc: number
}

// 激光雷达统计信息接口
interface LidarStats {
  validPoints: number
  maxDistance: number
  minDistance: number
  formattedTime: string
}

Component({
  data: {
    // GPS数据
    gpsData: {
      time: '',
      latitude: '',
      latDir: '',
      longitude: '',
      lonDir: '',
      status: '',
      satellites: '',
      hdop: '',
      altitude: '',
      geoidHeight: ''
    } as GPSData,
    // 激光雷达数据
    lidarData: {
      N: 0,
      rpm: 0,
      timestamp: 0,
      points: [],
      crc: 0
    } as LidarData,
    // 激光雷达统计
    lidarStats: {
      validPoints: 0,
      maxDistance: 0,
      minDistance: 0
    } as LidarStats,
    // 百度地图实例
    mapContext: null as any,
    // 地图标记点
    markers: [] as any[],
    // 定时器
    updateTimer: null as any,
  },

  lifetimes: {
    attached() {
      // 初始化百度地图
      this.initMap()
      // 模拟数据更新
      this.startDataUpdate()
    },
    detached() {
      // 清理定时器
      if (this.data.updateTimer) {
        clearInterval(this.data.updateTimer)
      }
    }
  },

  methods: {
    // 地图加载完成事件
    onMapLoad() {
      console.log('地图加载完成')
      // 获取地图上下文
      this.setData({
        mapContext: wx.createMapContext('map', this)
      })
      // 更新地图位置
      this.updateMapPosition(this.data.gpsData)
    },

    // 初始化百度地图
    initMap() {
      // 微信小程序地图组件无需额外初始化，通过map标签的属性直接控制
      console.log('地图初始化完成')
    },

    // GNGGA数据解析
    parseGNGGA(data: string): GPSData {
      const parts = data.split(',')
      if (parts[0] !== '$GNGGA') {
        return this.data.gpsData
      }

      // 解析时间 (HHMMSS.SS)
      const timeRaw = parts[1] || ''
      let time = ''
      if (timeRaw.length >= 6) {
        const hh = timeRaw.substring(0, 2)
        const mm = timeRaw.substring(2, 4)
        const ss = timeRaw.substring(4, 6)
        time = `${hh}:${mm}:${ss}`
      }

      // 解析纬度 (DDMM.MMMMM)
      const latRaw = parts[2] || ''
      let latitude = ''
      if (latRaw) {
        const degrees = parseInt(latRaw.substring(0, 2))
        const minutes = parseFloat(latRaw.substring(2))
        const latDec = degrees + minutes / 60
        latitude = latDec.toFixed(6)
      }

      // 解析经度 (DDDMM.MMMMM)
      const lonRaw = parts[4] || ''
      let longitude = ''
      if (lonRaw) {
        const degrees = parseInt(lonRaw.substring(0, 3))
        const minutes = parseFloat(lonRaw.substring(3))
        const lonDec = degrees + minutes / 60
        longitude = lonDec.toFixed(6)
      }

      return {
        time: time,
        latitude: latitude,
        latDir: parts[3] || '',
        longitude: longitude,
        lonDir: parts[5] || '',
        status: parts[6] === '1' ? '定位' : parts[6] === '0' ? '未定位' : '未知',
        satellites: parts[7] || '',
        hdop: parts[8] || '',
        altitude: parts[9] || '',
        geoidHeight: parts[11] || ''
      }
    },

    // 更新GPS数据
    updateGPSData(gpsStr: string) {
      const parsedData = this.parseGNGGA(gpsStr)
      this.setData({
        gpsData: parsedData
      })
      // 更新地图位置
      this.updateMapPosition(parsedData)
    },

    // 更新地图位置
    updateMapPosition(gpsData: GPSData) {
      const lat = parseFloat(gpsData.latitude)
      const lon = parseFloat(gpsData.longitude)
      if (lat && lon) {
        console.log('更新地图位置:', lat, lon)
        
        // 更新标记点
        const markers = [{
          id: 1,
          latitude: lat,
          longitude: lon,
          width: 40,
          height: 40,
          title: '当前位置',
          callout: {
            content: `GPS定位\n时间: ${gpsData.time}\n经纬度: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
            display: 'BYCLICK',
            fontSize: 14,
            bgColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#007aff'
          }
        }]
        
        this.setData({
          markers: markers
        })
        
        // 使用地图上下文设置中心位置（自动移动到当前位置）
        if (this.data.mapContext) {
          this.data.mapContext.moveToLocation({
            latitude: lat,
            longitude: lon,
            success: () => {
              console.log('地图移动到当前位置成功')
            },
            fail: (err: any) => {
              console.error('地图移动到当前位置失败:', err)
            }
          })
        }
      }
    },

    // 极坐标转直角坐标
    polarToCartesian(angle: number, distance_mm: number) {
      // 将角度转换为弧度
      const radian = (angle * Math.PI) / 180
      // 转换距离为米
      const distance_m = distance_mm / 1000
      // 计算直角坐标
      const x = distance_m * Math.cos(radian)
      const y = distance_m * Math.sin(radian)
      return { x, y }
    },

    // 格式化时间戳为具体日期时间
    formatTimestamp(timestamp: number): string {
      const now = new Date()
      // 如果timestamp是相对时间（如毫秒数），则使用当前时间
      const date = timestamp > 1e12 ? new Date(timestamp) : now
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
    },

    // 计算激光雷达统计信息
    calculateLidarStats(points: LidarPoint[], timestamp: number) {
      let validPoints = 0
      let maxDistance = 0
      let minDistance = Infinity

      points.forEach(point => {
        if (point.distance_mm > 0) {
          validPoints++
          if (point.distance_mm > maxDistance) {
            maxDistance = point.distance_mm
          }
          if (point.distance_mm < minDistance) {
            minDistance = point.distance_mm
          }
        }
      })

      return {
        validPoints,
        maxDistance,
        minDistance: minDistance === Infinity ? 0 : minDistance,
        formattedTime: this.formatTimestamp(timestamp)
      }
    },

    // 更新激光雷达数据
    updateLidarData(lidarData: LidarData) {
      // 计算统计信息，传递时间戳参数
      const stats = this.calculateLidarStats(lidarData.points, lidarData.timestamp)
      
      this.setData({
        lidarData: lidarData,
        lidarStats: stats
      })
      
      // 绘制点云
      this.drawPointCloud(lidarData.points)
    },

    // 绘制点云
    drawPointCloud(points: LidarPoint[]) {
      // 使用Canvas 2D API
      const query = wx.createSelectorQuery().in(this)
      query.select('#pointCloud')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (!res || !res[0]) return
          
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          // 使用推荐的新API并添加类型断言处理TypeScript类型定义缺失问题
          const windowInfo = (wx as any).getWindowInfo()
          const dpr = windowInfo.pixelRatio
          
          // 设置画布尺寸
          const canvasWidth = 300
          const canvasHeight = 300
          canvas.width = canvasWidth * dpr
          canvas.height = canvasHeight * dpr
          ctx.scale(dpr, dpr)
          
          const centerX = canvasWidth / 2
          const centerY = canvasHeight / 2
          const scale = 50 // 缩放因子，将米转换为像素
          const maxDistance = 100 // 最大显示距离（米）

          // 清空画布
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)

          // 绘制网格线 - 更现代化的风格
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)'
          ctx.lineWidth = 0.8
          
          // 同心圆网格
          const gridRadius = [1, 2, 3, 4, 5] // 以米为单位的同心圆半径
          gridRadius.forEach(radius => {
            const pixelRadius = radius * scale
            ctx.beginPath()
            ctx.arc(centerX, centerY, pixelRadius, 0, 2 * Math.PI)
            ctx.stroke()
            
            // 添加距离标签
            ctx.font = '12px sans-serif'
            ctx.fillStyle = 'rgba(100, 255, 218, 0.7)'
            ctx.fillText(`${radius}m`, centerX + pixelRadius + 5, centerY - 5)
          })
          
          // 十字线
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)'
          ctx.lineWidth = 1
          
          // 水平线
          ctx.beginPath()
          ctx.moveTo(0, centerY)
          ctx.lineTo(canvasWidth, centerY)
          ctx.stroke()
          
          // 垂直线
          ctx.beginPath()
          ctx.moveTo(centerX, 0)
          ctx.lineTo(centerX, canvasHeight)
          ctx.stroke()

          // 绘制原点（机器人位置）
          ctx.fillStyle = 'rgba(255, 69, 0, 0.9)'
          ctx.beginPath()
          ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI)
          ctx.fill()
          
          // 绘制机器人方向指示
          ctx.strokeStyle = 'rgba(255, 69, 0, 0.8)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX, centerY - 15)
          ctx.stroke()

          // 绘制点云 - 根据距离和强度着色
          points.forEach(point => {
            if (point.distance_mm > 0) {
              const distance_m = point.distance_mm / 1000
              const { x, y } = this.polarToCartesian(point.angle, point.distance_mm)
              const drawX = centerX + x * scale
              const drawY = centerY + y * scale
              
              // 检查点是否在画布范围内
              if (drawX >= 0 && drawX <= canvasWidth && drawY >= 0 && drawY <= canvasHeight && distance_m <= maxDistance) {
                // 根据距离设置颜色（近点红色，远点蓝色）
                const distanceRatio = Math.min(distance_m / maxDistance, 1)
                const r = Math.floor(255 * (1 - distanceRatio))
                const g = Math.floor(100 + 100 * (1 - distanceRatio))
                const b = Math.floor(100 + 155 * distanceRatio)
                const intensityRatio = Math.min(point.intensity / 255, 1)
                
                // 根据强度调整透明度
                const alpha = 0.3 + 0.7 * intensityRatio
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
                
                // 根据距离和强度调整点的大小
                const pointSize = 1 + 2 * intensityRatio
                
                ctx.beginPath()
                ctx.arc(drawX, drawY, pointSize, 0, 2 * Math.PI)
                ctx.fill()
              }
            }
          })
          
          // 添加方向标签
          ctx.font = '14px sans-serif'
          ctx.fillStyle = 'rgba(100, 255, 218, 0.8)'
          ctx.fillText('N', centerX - 6, 20)
          ctx.fillText('S', centerX - 6, canvasHeight - 10)
          ctx.fillText('W', 10, centerY + 6)
          ctx.fillText('E', canvasWidth - 20, centerY + 6)
        })
    },

    // 开始数据更新
    startDataUpdate() {
      // 模拟数据（作为网络请求失败的备选）
      const mockGPSData = "$GNGGA,023634.00,4004.73871635,N,11614.19729418,E,1,28,0.7,61.0988,M,-8.4923,M,,*58"
      
      // 模拟激光雷达数据
      const mockLidarData = {
        N: 16,
        rpm: 0,
        timestamp: Date.now(),
        points: [
          { angle: 0.0, distance_mm: 0, intensity: 0 },
          { angle: 22.5, distance_mm: 43520, intensity: 85 },
          { angle: 45.0, distance_mm: 257, intensity: 153 },
          { angle: 67.5, distance_mm: 39343, intensity: 175 },
          { angle: 90.0, distance_mm: 21675, intensity: 0 },
          { angle: 112.5, distance_mm: 43520, intensity: 85 },
          { angle: 135.0, distance_mm: 10240, intensity: 217 },
          { angle: 157.5, distance_mm: 8111, intensity: 5 },
          { angle: 180.0, distance_mm: 37172, intensity: 0 },
          { angle: 202.5, distance_mm: 0, intensity: 0 },
          { angle: 225.0, distance_mm: 15000, intensity: 100 },
          { angle: 247.5, distance_mm: 20000, intensity: 120 },
          { angle: 270.0, distance_mm: 25000, intensity: 140 },
          { angle: 292.5, distance_mm: 30000, intensity: 160 },
          { angle: 315.0, distance_mm: 35000, intensity: 180 },
          { angle: 337.5, distance_mm: 40000, intensity: 200 }
        ],
        crc: 0
      }

      // 数据更新函数
      const updateData = async () => {
        try {
          console.log('开始获取数据...')
          
          // 1. 获取GPS数据
          let gpsData = mockGPSData
          try {
            const gpsRes = await requestApi.getGPSData()
            if (gpsRes && typeof gpsRes === 'string') {
              gpsData = gpsRes
              console.log('GPS数据获取成功:', gpsData)
            }
          } catch (err) {
            console.error('GPS数据获取失败，使用模拟数据:', err)
          }
          
          // 2. 获取激光雷达数据
          let lidarData = mockLidarData
          try {
            const lidarRes = await requestApi.getLidarData()
            if (lidarRes && typeof lidarRes === 'object') {
              lidarData = lidarRes
              console.log('激光雷达数据获取成功:', lidarData)
            }
          } catch (err) {
            console.error('激光雷达数据获取失败，使用模拟数据:', err)
            // 模拟数据添加随机变化
            lidarData = {
              ...mockLidarData,
              timestamp: Date.now(),
              points: mockLidarData.points.map(point => ({
                ...point,
                angle: (point.angle + 1) % 360,
                distance_mm: point.distance_mm > 0 ? point.distance_mm + Math.floor((Math.random() - 0.5) * 1000) : 0
              }))
            }
          }
          
          // 3. 更新UI
          this.updateGPSData(gpsData)
          this.updateLidarData(lidarData)
          
        } catch (err) {
          console.error('数据更新失败:', err)
          // 使用模拟数据更新
          this.updateGPSData(mockGPSData)
          this.updateLidarData(mockLidarData)
        }
      }

      // 初始更新
      updateData()

      // 定时更新
      this.setData({
        updateTimer: setInterval(updateData, 2000) // 每2秒更新一次
      })
    },

    // Canvas触摸事件
    onCanvasTouch(e: any) {
      console.log('Canvas触摸事件:', e)
      
      // 添加点击反馈效果
      const ctx = wx.createCanvasContext('pointCloud', this)
      const canvasWidth = 300
      const canvasHeight = 300
      const centerX = canvasWidth / 2
      const centerY = canvasHeight / 2
      
      // 获取点击位置
      const touch = e.touches[0]
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = touch.x - rect.left
      const clickY = touch.y - rect.top
      
      // 绘制点击波纹效果
      this.drawRippleEffect(ctx, clickX, clickY, canvasWidth, canvasHeight)
      
      // 显示点击位置信息
      wx.showToast({
        title: `点击位置: (${Math.round(clickX)}, ${Math.round(clickY)})`,
        icon: 'none',
        duration: 1000
      })
    },
    
    // 绘制波纹效果
    drawRippleEffect(ctx: any, x: number, y: number, canvasWidth: number, canvasHeight: number) {
      // 创建临时画布上下文用于波纹效果
      const tempCtx = wx.createCanvasContext('pointCloud', this)
      
      // 绘制当前画布内容作为背景
      tempCtx.drawImage(`canvas://pointCloud`, 0, 0, canvasWidth, canvasHeight)
      
      // 绘制波纹
      let radius = 0
      const maxRadius = 50
      const rippleCount = 3
      
      const drawRipple = () => {
        tempCtx.clearRect(0, 0, canvasWidth, canvasHeight)
        tempCtx.drawImage(`canvas://pointCloud`, 0, 0, canvasWidth, canvasHeight)
        
        for (let i = 0; i < rippleCount; i++) {
          const currentRadius = radius - (i * maxRadius / rippleCount)
          if (currentRadius > 0) {
            const alpha = 1 - (currentRadius / maxRadius)
            tempCtx.setStrokeStyle(`rgba(0, 200, 255, ${alpha * 0.5})`)
            tempCtx.setLineWidth(2)
            tempCtx.beginPath()
            tempCtx.arc(x, y, currentRadius, 0, 2 * Math.PI)
            tempCtx.stroke()
          }
        }
        
        radius += 2
        if (radius <= maxRadius + (maxRadius / rippleCount)) {
          tempCtx.draw(false, () => {
            setTimeout(drawRipple, 30)
          })
        }
      }
      
      drawRipple()
    }
  }
})