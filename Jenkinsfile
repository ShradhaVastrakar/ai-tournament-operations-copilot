pipeline {
    agent any

    environment {
        PROJECT_PREFIX = "ai_tournament"
        WEB_IMAGE      = "ai_tournament_web"
        API_IMAGE      = "ai_tournament_api"
        AI_IMAGE       = "ai_tournament_ai_service"
        IMAGE_TAG      = "latest"
        DEPLOY_DIR     = "/opt/projects/ai-tournament-copilot"
    }

    stages {

        stage('Clone Repository') {
            steps {
                // TODO: set your branch, Jenkins credential ID and repo URL
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        credentialsId: 'khelo_tech_bitbucket',
                        url: 'https://github.com/ShradhaVastrakar/ai-tournament-operations-copilot.git'
                    ]]
                ])
            }
        }

        stage('Prepare Deploy Folder & Copy ENV') {
            steps {
                withCredentials([file(credentialsId: 'AI_TOURNAMENT_COPILOT_ENV', variable: 'ENV_FILE')]) {
                    sh '''
                        mkdir -p ${DEPLOY_DIR}

                        # Copy docker-compose to deploy folder
                        cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml

                        # Create/replace .env with proper permissions
                        install -m 664 "$ENV_FILE" ${DEPLOY_DIR}/.env

                        # Workspace .env (used to read the web build arg; excluded from images by .dockerignore)
                        install -m 664 "$ENV_FILE" .env

                        echo ".env copied successfully."
                        ls -l ${DEPLOY_DIR}/.env
                    '''
                }
            }
        }

        stage('Clean Docker Cache') {
            steps {
                sh '''
                    cd ${DEPLOY_DIR}
                    docker compose down || true

                    docker builder prune -af || true
                    docker image rm -f ${WEB_IMAGE}:${IMAGE_TAG} ${API_IMAGE}:${IMAGE_TAG} ${AI_IMAGE}:${IMAGE_TAG} || true

                    rm -rf ${WORKSPACE}/apps/web/.next || true
                '''
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('AI Service') {
                    steps {
                        sh '''
                            docker build --no-cache \
                                -f apps/ai-service/Dockerfile \
                                -t ${AI_IMAGE}:${IMAGE_TAG} .
                        '''
                    }
                }
                stage('API') {
                    steps {
                        sh '''
                            docker build --no-cache \
                                -f apps/api/Dockerfile \
                                -t ${API_IMAGE}:${IMAGE_TAG} .
                        '''
                    }
                }
                stage('Web') {
                    steps {
                        sh '''
                            NEXT_PUBLIC_API_BASE_URL=$(grep -E '^NEXT_PUBLIC_API_BASE_URL=' .env | cut -d= -f2- | tr -d '\\r"')
                            if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then
                                echo "NEXT_PUBLIC_API_BASE_URL missing in .env"; exit 1
                            fi
                            echo "Building web with NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"

                            docker build --no-cache \
                                -f apps/web/Dockerfile \
                                --build-arg NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
                                -t ${WEB_IMAGE}:${IMAGE_TAG} .
                        '''
                    }
                }
            }
        }

        stage('Deploy Containers') {
            steps {
                sh '''
                    cd ${DEPLOY_DIR}

                    echo "Stopping old containers..."
                    docker compose down || true

                    echo "Starting new containers..."
                    docker compose up -d --force-recreate

                    echo "Deployment completed successfully!"
                '''
            }
        }

        stage('Verify Containers') {
            steps {
                sh '''
                    sleep 20
                    docker ps --filter "name=${PROJECT_PREFIX}_"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ AI Tournament Copilot (web + api + ai-service) deployed successfully."

            sh '''
                docker ps --filter "name=${PROJECT_PREFIX}_"
                docker images | grep ${PROJECT_PREFIX} || true
            '''
        }

        failure {
            echo "❌ Deployment Failed."

            sh '''
                docker ps -a || true
                docker images | grep ${PROJECT_PREFIX} || true
                cd ${DEPLOY_DIR} && docker compose logs --tail=100 || true
            '''
        }
    }
}
