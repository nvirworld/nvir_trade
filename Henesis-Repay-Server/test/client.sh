#!/usr/bin/env bash

curl http://localhost:9999/api -i \
	-X POST \
	-H 'Content-Type:application/json' \
	-d '{"jsonrpc":"2.0","method":"api1","id":1}'
