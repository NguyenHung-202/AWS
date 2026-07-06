# Hệ thống Chấm Điểm Tự động Bài Viết Tiếng Anh (Essay Scoring System)

Đây là phần Backend được xây dựng bằng **AWS SAM (Serverless Application Model)** và **Java 17**, giúp tự động chấm điểm bài viết tiếng Anh sử dụng AI (Google Gemini 1.5 Flash).

## 👥 Quy Tắc Làm Việc Nhóm

### Branching Strategy
- **main**: Chứa code ổn định, deploy lên Production
- **develop**: Chứa code mới nhất cho môi trường Dev
- **feature/<ten-tinh-nang>**: Tạo từ develop để làm tính năng mới (ví dụ: `feature/get-presigned-url`)
- **bugfix/<ten-bug>**: Từ develop để fix bug
- **Pull Request (PR)**: Yêu cầu review trước khi merge vào develop, cần ít nhất 1 approval

### Quy Tắc Commit
- Dùng prefix rõ ràng: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Ví dụ: `feat: add create essay API endpoint`

---

## 🏗️ Kiến trúc hệ thống

Hệ thống sử dụng kiến trúc Serverless với các dịch vụ AWS sau:
- **Amazon Cognito**: Xác thực người dùng
- **Amazon API Gateway**: REST API
- **AWS Lambda**: Xử lý logic nghiệp vụ (4 functions)
- **Amazon S3**: Lưu trữ file bài viết gốc và kết quả
- **Amazon SQS**: Hàng đợi tin nhắn
- **AWS Step Functions**: Orchestration workflow
- **Amazon Textract**: Trích xuất văn bản từ file
- **Amazon DynamoDB**: Lưu trữ dữ liệu bài viết
- **Amazon SNS**: Gửi thông báo email
- **AWS Systems Manager Parameter Store**: Lưu trữ API Key an toàn

## 📂 Cấu trúc thư mục

```
backend/
├── get-presigned-url/          # Lambda tạo Presigned URL upload file lên S3
│   ├── pom.xml
│   └── src/main/java/com/essayscoring/GetPresignedUrlHandler.java
├── router-store/               # Lambda quản lý API và DynamoDB
│   ├── pom.xml
│   └── src/main/java/com/essayscoring/RouterStoreHandler.java
├── job-starter/                # Lambda kích hoạt Step Functions từ SQS
│   ├── pom.xml
│   └── src/main/java/com/essayscoring/JobStarterHandler.java
├── ai-evaluator/               # Lambda gọi Gemini API để chấm điểm
│   ├── pom.xml
│   └── src/main/java/com/essayscoring/AiEvaluatorHandler.java
├── template.yaml               # Template SAM định nghĩa tất cả resources
├── state-machine.asl.json      # Định nghĩa workflow Step Functions
├── .gitignore                  # File ignore cho Git
└── README.md                   # File này
```

---

## 🛠️ Cài Đặt Môi Trường Dev

### Yêu cầu tiên quyết
- **Java 17**: [Tải về](https://adoptium.net/temurin/releases/?version=17)
- **Maven 3.9+**: [Tải về](https://maven.apache.org/download.cgi)
- **AWS CLI**: [Cài đặt](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS SAM CLI**: [Cài đặt](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### Cấu hình AWS Credentials
```bash
aws configure
# Nhập Access Key ID, Secret Access Key, Region (vd: us-east-1), Output format: json
```

### Build dự án local
```bash
# Di chuyển vào backend
cd backend/

# Build toàn bộ module
mvn clean install
```

---

## 🚀 Hướng dẫn Deploy

### 1. Tạo SSM Parameter cho Gemini API Key
Trước khi deploy, tạo parameter trên AWS Systems Manager:
1. Mở AWS Console → **Systems Manager** → **Parameter Store**
2. **Create parameter**
3. Name: `/essay-scoring/gemini-api-key`
4. Type: **SecureString**
5. Value: Nhập Gemini API Key của bạn
6. **Create parameter**

### 2. Deploy lên Môi trường Dev
```bash
# Di chuyển vào backend
cd backend/

# Build
sam build

# Deploy (chỉ cần chạy --guided lần đầu)
sam deploy --guided --config-env dev
```

### 3. Deploy lên Môi trường Staging (QA)
```bash
sam deploy --config-env staging
```

### 4. Deploy lên Production
```bash
sam deploy --config-env prod
```

---

## 📝 Lệnh Thường Dùng

| Lệnh | Mô tả |
|------|-------|
| `mvn clean install` | Build toàn bộ module Java |
| `sam build` | Build SAM template |
| `sam deploy --config-env <dev/staging/prod>` | Deploy lên môi trường cụ thể |
| `sam local invoke <FunctionName>` | Test Lambda local |
| `sam local start-api` | Chạy API Gateway local |

---

## 🛠 Tech Stack

- **Ngôn ngữ**: Java 17
- **Framework**: AWS SAM (Serverless Application Model)
- **AWS Services**: Lambda, API Gateway, S3, SQS, SNS, DynamoDB, Step Functions, Textract, Cognito, Systems Manager
- **AI**: Google Gemini 1.5 Flash

---

## 📋 Môi Trường và Quy Trình CI/CD
- **Dev**: Tự động deploy khi merge vào develop
- **Staging**: Tự động deploy khi merge vào staging branch (QA test)
- **Prod**: Deploy thủ công khi merge vào main, cần approval
