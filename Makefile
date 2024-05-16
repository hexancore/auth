PROJECT = hc-auth

init_tmp:
	mkdir -p ./tmp/redis
	chmod 0777 -R ./tmp
	chmod 0777 -R ./docker

up:
	docker compose -p $(PROJECT) --env-file ./docker/.env up -d --wait --wait-timeout 5

down:
	docker compose -p $(PROJECT) down -t 2

act:
	mkdir -p ./tmp/redis
	chmod 0777 -R ./tmp
	chmod 0777 -R ./docker
	act workflow_dispatch --input releaseType=minor

oidc_provider:
	./bin/test_oidc_provider.ts

oidc_app:
	yarn build
	APP_ENV=dev APP_ID=hc_auth_oidc_app APP_LOG_PRETTY=0 ./example/oidc/oidc_app.ts