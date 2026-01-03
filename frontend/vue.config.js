const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    devServer: {
        client: {
            overlay: false
        },
        proxy: {
            "/api": {
              target: "http://113.44.142.91:5000",
              changeOrigin: true,
              pathRewrite: {
                "^/api": "/api/v1",
              },
            },
            // ✅ 新增这一段
            "/static": {
                target: "http://113.44.142.91:5000",
                changeOrigin: true,
            },
          },
        
    },
    css: {
        loaderOptions: {
            scss: {
                implementation: require('sass')
            }
        }
    }
})
