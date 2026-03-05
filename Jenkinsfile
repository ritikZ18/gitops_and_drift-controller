pipeline {
    agent any

    environment {
        REGISTRY = 'registry.acme.io'
        IMAGE_NAME = 'gitops-controller'
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Go Tests') {
            steps {
                dir('server') {
                    sh 'go mod tidy'
                    sh 'go vet ./...'
                    sh 'go test ./... -v -cover -coverprofile=coverage.out'
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'server/coverage.out', allowEmptyArchive: true
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('client') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Go Build') {
            steps {
                dir('server') {
                    sh 'CGO_ENABLED=0 GOOS=linux go build -o ../gitops-controller ./cmd/server'
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'gitops-controller', fingerprint: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ."
                sh "docker tag ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:latest"
            }
        }

        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'registry-creds',
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {
                    sh "echo ${REG_PASS} | docker login ${REGISTRY} -u ${REG_USER} --password-stdin"
                    sh "docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${REGISTRY}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    oc set image deployment/gitops-controller \
                        gitops-controller=${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                        -n gitops-staging
                """
                sh 'oc rollout status deployment/gitops-controller -n gitops-staging --timeout=120s'
            }
        }
    }

    post {
        success {
            echo "Build ${IMAGE_TAG} succeeded"
        }
        failure {
            echo "Build ${IMAGE_TAG} failed"
        }
        cleanup {
            sh "docker rmi ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true"
        }
    }
}
