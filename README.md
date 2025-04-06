# Coupang Proxy Server

프론트엔드 또는 Firebase Functions에서 쿠팡 Open API를 직접 호출하지 않고,
Render에서 배포된 Node.js 프록시 서버를 통해 안전하게 호출할 수 있습니다.

## 사용 방법

1. `.env`에 쿠팡 API 키 정보를 입력하거나 Render 환경변수로 설정
2. `/coupang/orders` 경로로 GET 요청하면 주문 데이터 반환

## 예시

```bash
GET https://your-render-url.onrender.com/coupang/orders
```
