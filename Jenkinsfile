        stage('Instalar Dependencias') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Gerar Prisma Client') {
            environment {
                DATABASE_URL = 'mysql://USUARIO:SENHA@edumysql.acesso.rj.senac.br:3306/NOME_DO_BANCO'
            }
            steps {
                bat 'npx prisma generate'
            }
        }

        stage('Testes e2e') {
            steps {
                bat 'npm run test:e2e'
            }
        }

        stage('Construir Imagem Docker') {
            steps {
                bat 'docker build -t %IMAGE_NAME%:%BUILD_NUMBER% -t %IMAGE_NAME%:latest .'
            }
        }

        stage('Fazer Deploy') {
            steps {
                bat 'docker rm -f %CONTAINER_NAME% || exit 0'

                withCredentials([string(credentialsId: 'INFISICAL_TOKEN_BIA', variable: 'INFISICAL_TOKEN')]) {
                    bat 'docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p %APP_PORT%:%APP_PORT% -e INFISICAL_TOKEN %IMAGE_NAME%:latest'
                }
            }
        }