## Getting Started

```
npm install -g vhost-manager

mkdir /my/hosts/directory

node-vhost-manager --hosts-dir=/my/hosts/directory
```

## Configure VHost Manager Settings

By default vhost-manager will look for 'hosts' in the current directory to use for it's hosts directory. You can explicitly specify the hosts directory with `node-vhost-manager --hosts-dir=<directory>` or using a JSON file with the key `hostsDirectory`. If no JSON file is provided it will look for `vhosts.json`. If `vhosts.json` is not found it will use the default settings.

```
node-vhost-manager my-settings.json
``` 
