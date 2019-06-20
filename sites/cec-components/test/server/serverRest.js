/**
 * Copyright (c) 2019 Oracle and/or its affiliates. All rights reserved.
 * Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl.
 */
/* global module, process */
/* jshint esversion: 6 */
var request = require('request'),
	Client = require('node-rest-client').Client,
	siteUtils = require('./serverUtils');

var _utils = {
	getServer: function (currPath, registeredServerName) {
		return registeredServerName ? siteUtils.getRegisteredServer(currPath, registeredServerName) : siteUtils.getConfiguredServer(currPath);
	},
	getAuth: function (server) {
		var auth = server.env === 'pod_ec' ? {
			bearer: server.oauthtoken
		} : {
			user: server.username,
			password: server.password
		};

		return {
			user: server.username,
			password: server.password
		};
	}
};

//
// Folder CRUD
//

// Create Folder on server
var _createFolder = function (server, parentID, foldername) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/folders/' + parentID,
			args = {
				headers: {
					"Content-Type": "application/json"
				},
				data: {
					'name': foldername,
					'description': ''
				}
			};

		client.post(url, args, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(data);
			} else {
				console.log('Failed to create Folder: ' + foldername);
				// continue
				resolve();
			}
		});
	});
};

/**
 * Create folder on server by folder name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.parentID The DOCS GUID for the folder where the new file should be created.
 * @param {string} args.foldername The name of the folder to create.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.createFolder = function (args) {
	return _createFolder(_utils.getServer(args.currPath, args.registeredServerName), args.parentID, args.foldername);
};

// Find or Create Folder on server
var _findOrCreateFolder = function (server, parentID, foldername) {
	return new Promise(function (resolve, reject) {
		// try to find the folder
		_findFile(server, parentID, foldername).then(function (existingFolder) {
			// if we've found the folder, return it
			if (existingFolder) {
				return resolve(existingFolder);
			}

			// didn't find the folder, create it
			_createFolder(server, parentID, foldername).then(function (newFolder) {
				// return the created folder
				return resolve(newFolder);
			});
		});
	});
};

/**
 * Find or Create folder on server by folder name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.parentID The DOCS GUID for the folder where the new file should be created.
 * @param {string} args.foldername The name of the folder to create.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.findOrCreateFolder = function (args) {
	return _findOrCreateFolder(_utils.getServer(args.currPath, args.registeredServerName), args.parentID, args.foldername);
};


// Delete Folder on server
var _deleteFolder = function (server, fFolderGUID) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/folders/' + fFolderGUID;

		client.delete(url, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(data);
			} else {
				console.log('Failed to delete Folder: ' + fFileGUID);
				// continue
				resolve();
			}
		});
	});
};
/**
 * Delete Folder from server by folder GUID
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.fFolderGUID The DOCS GUID for the folder to delete
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.deleteFolder = function (args) {
	return _deleteFolder(_utils.getServer(args.currPath, args.registeredServerName), args.fFolderGUID);
};

// Find file by name with the parent folder
var _findFile = function (server, parentID, filename) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/folders/' + parentID + '/items';

		client.get(url, function (data, response) {
			// try to find the requested folder
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				// find the requested folder
				var items = (data && data.items || []);
				for (var i = 0; i < items.length; i++) {
					if (items[i].name === filename) {
						return resolve(items[i]);
					}
				}
			}

			// folder not found
			console.log('Failed to find File: ' + filename);
			return resolve();
		});
	});
};
/**
 * Find the file from server under the given parent
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.parentID The DOCS GUID for the folder to search
 * @param {string} args.filename The name of the folder to find
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.findFile = function (args) {
	return _findFile(_utils.getServer(args.currPath, args.registeredServerName), args.parentID, args.filename);
};


//
// File CRUD
//

// Create file on server
var _createFile = function (server, parentID, filename, contents) {
	return new Promise(function (resolve, reject) {
		var options = {
			method: 'POST',
			url: server.url + '/documents/api/1.2/files/data/',
			auth: {
				user: server.username,
				password: server.password
			},
			headers: {
				'Content-Type': 'multipart/form-data'
			},
			formData: {
				jsonInputParameters: JSON.stringify({
					'parentID': parentID
				}),
				'primaryFile': {
					value: contents,
					options: {
						'filename': filename
					}
				}
			}
		};

		request(options, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(JSON.parse(response.body));
			} else {
				console.log('Failed to create file: ' + fFileGUID);
				// continue 
				resolve();
			}
		});
	});
};
/**
 * Create file from server by file name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.parentID The DOCS GUID for the folder where the new file should be created.
 * @param {string} args.filename The name of the file to create.
 * @param {stream} args.contents The filestream to upload.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.createFile = function (args) {
	return _createFile(_utils.getServer(args.currPath, args.registeredServerName), args.parentID, args.filename, args.contents);
};


// Read file from server
var _readFile = function (server, fFileGUID) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/files/' + fFileGUID + '/data/';

		client.get(url, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(data);
			} else {
				// continue 
				resolve();
			}
		});
	});
};
/**
 * Read file from server by file name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.fFileGUID The DOCS GUID for the file to update
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.readFile = function (args) {
	return _readFile(_utils.getServer(args.currPath, args.registeredServerName), args.fFileGUID);
};

// Update file on server
var _updateFile = function (server, fFileGUID, contents) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/files/' + fFileGUID + '/data/',
			args = {
				data: contents
			};

		client.post(url, args, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(data);
			} else {
				console.log('Failed to update file: ' + fFileGUID);
				// continue 
				resolve();
			}
		});
	});
};
/**
 * Update file from server by file GUID
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.fFileGUID The DOCS GUID for the file to update
 * @param {stream} args.contents The filestream to upload
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.updateFile = function (args) {
	return _updateFile(_utils.getServer(args.currPath, args.registeredServerName), args.fFileGUID, args.contents);
};

// Delete file from server
var _deleteFile = function (server, fFileGUID) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/documents/api/1.2/files/' + fFileGUID;

		client.delete(url, function (data, response) {
			if (response && response.statusCode >= 200 && response.statusCode < 300) {
				resolve(data);
			} else {
				console.log('Failed to delete file: ' + fFileGUID);
				// continue 
				resolve();
			}
		});
	});
};
/**
 * Delete file from server by file GUID
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.fFileGUID The DOCS GUID for the file to delete
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.deleteFile = function (args) {
	return _deleteFile(_utils.getServer(args.currPath, args.registeredServerName), args.fFileGUID);
};


// Create channel on server
var _createChannel = function (server, name, channelType, description, publishPolicy, localizationPolicy) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {
				var csrfToken = result && result.token;

				var payload = {
					'name': name,
					'channelType': channelType || 'public',
					'description': description || '',
					'publishPolicy': publishPolicy || 'anythingPublished'
				};
				if (localizationPolicy) {
					payload.localizationPolicy = localizationPolicy
				}

				var client = new Client({
						user: server.username,
						password: server.password
					}),
					url = server.url + '/content/management/api/v1.1/channels',
					args = {
						headers: {
							'Content-Type': 'application/json',
							'X-CSRF-TOKEN': csrfToken,
							'X-REQUESTED-WITH': 'XMLHttpRequest'
						},
						data: payload
					};

				client.post(url, args, function (data, response) {
					if (response && response.statusCode >= 200 && response.statusCode < 300) {
						resolve(data);
					} else {
						console.log('Failed to create channel: ' + name + ' - ' + response.statusMessage);
						// continue
						resolve({
							err: 'err'
						});
					}
				});
			}
		});
	});
};

/**
 * Create channel on server by channel name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.name The name of the channel to create.
 * @param {string} args.description The description of the channel to create.
 * @param {string} args.channelType The type of the channel, defaults to public.
 * @param {string} args.publishPolicy the publish policy, defaults to anythingPublished.
 * @param {string} args.localizationPolicy the id of the localization policy.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.createChannel = function (args) {
	return _createChannel(_utils.getServer(args.currPath, args.registeredServerName), args.name, args.channelType,
		args.description, args.publishPolicy, args.localizationPolicy);
};

// Add channel to repository
var _addChannelToRepository = function (server, channelId, channelName, repository) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {

				var csrfToken = result && result.token;

				var channel = {
					'id': channelId
				};
				var data = repository;
				if (data.channels) {
					data.channels.push(channel);
				} else {
					data.channels = [channel];
				}

				var request = require('request');
				var url = server.url + '/content/management/api/v1.1/repositories/' + repository.id;

				var auth = {
					user: server.username,
					password: server.password
				};
				var postData = {
					method: 'PUT',
					url: url,
					auth: auth,
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						'X-REQUESTED-WITH': 'XMLHttpRequest'
					},
					body: data,
					json: true
				};

				request(postData, function (error, response, body) {
					if (error) {
						console.log('Failed to add channel ' + channelName + ' to respository ' + repository.name);
						console.log(error);
						resolve({
							err: 'err'
						});
					}
					if (response && response.statusCode === 200) {
						var data;
						try {
							data = JSON.parse(body);
						} catch (error) {};
						resolve({
							data
						});
					} else {
						console.log('Failed to add channel ' + channelName + ' to respository ' + repository.name + ' ' + response.statusMessage);
						resolve({
							err: 'err'
						});
					}
				});
			}
		});
	});
};

/**
 * Add channel to repository on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.id The id of the channel to add.
 * @param {string} args.name The naem of the channel.
 * @param {object} repository JavaScript object containing repository
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.addChannelToRepository = function (args) {
	return _addChannelToRepository(_utils.getServer(args.currPath, args.registeredServerName), args.id, args.name, args.repository);
};


// Get channels from server
var _getChannels = function (server) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/channels?limit=999';

		var req = client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data && data.items);
			} else {
				console.log('ERROR: failed to get channels: ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
		req.on("error", function (err) {
			console.log('ERROR: ' + err);
			resolve({
				err: 'err'
			});
		})
	});
};
/**
 * Get all channels on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getChannels = function (args) {
	return _getChannels(_utils.getServer(args.currPath, args.registeredServerName));
};

// Get channel from server
var _getChannel = function (server, channelId) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/channels/' + channelId;

		client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data);
			} else {
				console.log('ERROR: failed to get channel: ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
	});
};
/**
 * Get a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.id The id of the channel to query.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getChannel = function (args) {
	return _getChannel(_utils.getServer(args.currPath, args.registeredServerName), args.id);
};


// Get all items in a channel from server
var _getChannelItems = function (server, channelToken, fields) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/items?limit=9999&channelToken=' + channelToken;
		if (fields) {
			url = url + '&fields=' + fields;
		}
		client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data && data.items);
			} else {
				console.log('ERROR: failed to get channel items: ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
	});
};
/**
 * Get all items in a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.channelToken The token of the channel to query.
 * @param {string} args.fields The extral fields returned from the query.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getChannelItems = function (args) {
	return _getChannelItems(_utils.getServer(args.currPath, args.registeredServerName), args.channelToken, args.fields);
};

// perform bulk operation on items in a channel from server
var _opChannelItems = function (server, operation, channelIds, itemIds, queryString) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {

				var csrfToken = result && result.token;

				var request = siteUtils.getRequest();

				var q = '';
				if (queryString) {
					q = queryString;
				} else {
					for (var i = 0; i < itemIds.length; i++) {
						if (q) {
							q = q + ' or ';
						}
						q = q + 'id eq "' + itemIds[i] + '"';
					}
				}

				var channels = [];
				for (var i = 0; i < channelIds.length; i++) {
					channels.push({
						id: channelIds[i]
					});
				}

				var url = server.url + '/content/management/api/v1.1/bulkItemsOperations';

				var auth = {
					user: server.username,
					password: server.password
				};

				var operations = {};
				operations[operation] = {
					channels: channels
				};
				if (operation === 'validatePublish') {
					operations[operation]['validation'] = {
						verbosity: 'normal'
					};
				}
				var formData = {
					q: q,
					operations: operations
				};
				// console.log(JSON.stringify(formData));

				var postData = {
					method: 'POST',
					url: url,
					auth: auth,
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						'X-REQUESTED-WITH': 'XMLHttpRequest'
					},
					body: formData,
					json: true
				};

				request(postData, function (error, response, body) {
					if (error) {
						console.log('Failed to ' + operation + ' items ');
						console.log(error);
						resolve({
							err: 'err'
						});
					}

					var data;
					try {
						data = JSON.parse(body);
					} catch (e) {
						data = body;
					};

					if (response && (response.statusCode === 200 || response.statusCode === 201 || response.statusCode === 202)) {
						var statusId = response.headers && response.headers.location || '';
						statusId = statusId.substring(statusId.lastIndexOf('/') + 1);
						return resolve({
							statusId: statusId,
							data: data
						});
					} else {
						var msg = data ? (data.detail || data.title) : response.statusMessage;
						console.log('Failed to ' + operation + ' items - ' + msg);
						resolve({
							err: 'err'
						});
					}
				});

			} // get token
		});
	});
};
/**
 * Publish items in a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.channelId The id of the channel to publish items.
 * @param {array} args.itemIds The id of items to publish
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.publishChannelItems = function (args) {
	return _opChannelItems(_utils.getServer(args.currPath, args.registeredServerName), 'publish', [args.channelId], args.itemIds);
};

/**
 * Unpublish items in a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.channelId The id of the channel to publish items.
 * @param {array} args.itemIds The id of items to publish
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.unpublishChannelItems = function (args) {
	return _opChannelItems(_utils.getServer(args.currPath, args.registeredServerName), 'unpublish', [args.channelId], args.itemIds);
};

/**
 * Remove items from a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.channelId The id of the channel to publish items.
 * @param {array} args.itemIds The id of items to publish
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.removeItemsFromChanel = function (args) {
	return _opChannelItems(_utils.getServer(args.currPath, args.registeredServerName), 'removeChannels', [args.channelId], args.itemIds);
};

/**
 * Validate items from a channel on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.channelId The id of the channel to validate items.
 * @param {array} args.itemIds The id of items to publish
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.validateChannelItems = function (args) {
	return _opChannelItems(_utils.getServer(args.currPath, args.registeredServerName), 'validatePublish', [args.channelId], args.itemIds);
};

var _getItemOperationStatus = function (server, statusId) {
	return statusPromise = new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/bulkItemsOperations/' + statusId;

		client.get(url, function (data, response) {
			if (response && (response.statusCode === 200 || response.statusCode === 201)) {
				resolve(data);
			} else {
				console.log('ERROR: failed to get channel operation status ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
	});
};
/**
 * Get item bulk operation status
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.statusId The id of operation status
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getItemOperationStatus = function (args) {
	return _getItemOperationStatus(_utils.getServer(args.currPath, args.registeredServerName), args.statusId);
};

// Get localization policies from server
var _getLocalizationPolicies = function (server) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/localizationPolicies?limit=999';

		var req = client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data && data.items);
			} else {
				console.log('ERROR: failed to get localization policies: ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
		req.on("error", function (err) {
			console.log('ERROR: ' + err);
			resolve({
				err: 'err'
			});
		})
	});
};
/**
 * Get all localization policies on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getLocalizationPolicies = function (args) {
	return _getLocalizationPolicies(_utils.getServer(args.currPath, args.registeredServerName));
};

// Create localization policy on server
var _createLocalizationPolicy = function (server, name, description, requiredLanguages, defaultLanguage, optionalLanguages) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {
				var csrfToken = result && result.token;

				var client = new Client({
						user: server.username,
						password: server.password
					}),
					url = server.url + '/content/management/api/v1.1/localizationPolicies',
					payload = {};

				payload.name = name;
				payload.description = description || '';
				payload.requiredValues = requiredLanguages;
				payload.defaultValue = defaultLanguage;
				payload.optionalValues = optionalLanguages || [];

				var args = {
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						'X-REQUESTED-WITH': 'XMLHttpRequest'
					},
					data: payload
				};

				client.post(url, args, function (data, response) {
					if (response && response.statusCode >= 200 && response.statusCode < 300) {
						resolve(data);
					} else {
						console.log('ERROR: failed to create localization policy: ' + name + ' - ' + (data && data.detail ? data.detail : response.statusMessage));
						// continue
						resolve({
							err: 'err'
						});
					}
				});
			}
		});
	});
};
/**
 * Create localization policy on server by channel name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.name The name of the localization policy to create.
 * @param {string} args.description The description of the localization policy.
 * @param {string} args.defaultLanguage The default language of the localization policy.
 * @param {array} args.requiredLanguages The list of required languages.
 * @param {array} args.optionalLanguages The list of optional languages.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.createLocalizationPolicy = function (args) {
	return _createLocalizationPolicy(_utils.getServer(args.currPath, args.registeredServerName), args.name, args.description,
		args.requiredLanguages, args.defaultLanguage, args.optionalLanguages);
};

// Get repositories from server
var _getRepositories = function (server) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/repositories?limit=999&fields=all';

		var req = client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data && data.items);
			} else {
				console.log('ERROR: failed to get repositories: ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
		req.on("error", function (err) {
			console.log('ERROR: ' + err);
			resolve({
				err: 'err'
			});
		})

	});
};
/**
 * Get all repositories on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getRepositories = function (args) {
	return _getRepositories(_utils.getServer(args.currPath, args.registeredServerName));
};

// Create repository on server
var _createRepository = function (server, name, description, contentTypes, channels, defaultLanguage) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {
				var csrfToken = result && result.token;

				var client = new Client({
						user: server.username,
						password: server.password
					}),
					url = server.url + '/content/management/api/v1.1/repositories',
					payload = {};
				payload.name = name;
				payload.description = description || '';
				payload.defaultLanguage = defaultLanguage || 'en-US';
				payload.taxonomies = [];

				if (contentTypes && contentTypes.length > 0) {
					payload.contentTypes = contentTypes;
				}
				if (channels && channels.length > 0) {
					payload.channels = channels;
				}

				var args = {
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						'X-REQUESTED-WITH': 'XMLHttpRequest'
					},
					data: payload
				};

				client.post(url, args, function (data, response) {
					if (response && response.statusCode >= 200 && response.statusCode < 300) {
						resolve(data);
					} else {
						console.log('ERROR: failed to create repository: ' + name + ' - ' + (data && data.detail ? data.detail : response.statusMessage));
						// continue
						resolve({
							err: 'err'
						});
					}
				});
			}
		});
	});
};
/**
 * Create channel on server by channel name
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.name The name of the repository to create.
 * @param {string} args.description The description of the repository.
 * @param {string} args.defaultLanguage The default language of the repository.
 * @param {array} args.contentTypes The list of content types.
 * @param {array} args.channels The list of channels.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.createRepository = function (args) {
	return _createRepository(_utils.getServer(args.currPath, args.registeredServerName), args.name, args.description,
		args.contentTypes, args.channels, args.defaultLanguage);
};

// Update repository
var _updateRepository = function (server, repository, contentTypes, channels) {
	return new Promise(function (resolve, reject) {
		siteUtils.getCaasCSRFToken(server).then(function (result) {
			if (result.err) {
				resolve(result);
			} else {
				var csrfToken = result && result.token;

				var data = repository;
				data.contentTypes = contentTypes;
				data.channels = channels;

				var request = require('request');
				var url = server.url + '/content/management/api/v1.1/repositories/' + repository.id;

				var auth = {
					user: server.username,
					password: server.password
				};
				var postData = {
					method: 'PUT',
					url: url,
					auth: auth,
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-TOKEN': csrfToken,
						'X-REQUESTED-WITH': 'XMLHttpRequest'
					},
					body: data,
					json: true
				};

				request(postData, function (error, response, body) {
					if (error) {
						console.log('Failed to add channel ' + channelName + ' to respository ' + repository.name);
						console.log(error);
						resolve({
							err: 'err'
						});
					}
					if (response && response.statusCode === 200) {
						var data;
						try {
							data = JSON.parse(body);
						} catch (error) {
							data = body;
						};
						resolve(data);
					} else {
						console.log('Failed to update repository respository ' + repository.name + ' - ' + response.statusMessage);
						resolve({
							err: 'err'
						});
					}
				});
			}
		});
	});
};
/**
 * Update repository on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {object} repository JavaScript object containing repository
 * @param {array} args.contentTypes The list of content types.
 * @param {array} args.channels The list of channels.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.updateRepository = function (args) {
	return _updateRepository(_utils.getServer(args.currPath, args.registeredServerName), args.repository, args.contentTypes, args.channels);
};

// Get typefrom server
var _getContentType = function (server, typeName) {
	return new Promise(function (resolve, reject) {
		var client = new Client({
				user: server.username,
				password: server.password
			}),
			url = server.url + '/content/management/api/v1.1/types/' + typeName;

		client.get(url, function (data, response) {
			if (response && response.statusCode === 200) {
				resolve(data);
			} else {
				console.log('ERROR: failed to get type ' + typeName + ' : ' + (response.statusMessage || response.statusCode));
				resolve({
					err: 'err'
				});
			}
		});
	});
};
/**
 * Get a content type on server 
 * @param {object} args JavaScript object containing parameters. 
 * @param {string} [args.registeredServerName=''] Name of the server to use. If not specified, will use server in cec.properties file
 * @param {string} [args.currPath=''] Location of the project source. This is used to get the registered server.
 * @param {string} args.name The name of the type to query.
 * @returns {Promise.<object>} The data object returned by the server.
 */
module.exports.getContentType = function (args) {
	return _getContentType(_utils.getServer(args.currPath, args.registeredServerName), args.name);
};