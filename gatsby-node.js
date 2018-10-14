const _  = require('lodash')
const fetch = require('node-fetch')
const queryString = require('query-string')
const crypto = require('crypto')

exports.sourceNodes = (
	{ boundActionCreators, createNodeId },
	configOptions
) => {
	const { createNode } = boundActionCreators

	// Helper function that processes a photo to match Gatsby's node structure
	const processProperty = property => {
		const nodeId = createNodeId(`exposify-property-${property.id}`)
		const nodeContent = JSON.stringify(property)
		const nodeContentDigest = crypto
			.createHash('md5')
			.update(nodeContent)
			.digest('hex')

		const nodeData = {
			id: nodeId,
			parent: null,
			children: [],
			attributes: property.attributes,
			internal: {
				type: `ExposifyProperty`,
				content: nodeContent,
				contentDigest: nodeContentDigest,
			},
		}

		return nodeData
	}

	const apiKey = configOptions.key
	const appUrl = configOptions.app || 'https://app.exposify.de'

	if (!apiKey) {
		throw 'Please provide a Key for the Exposify API in the gatsby-source-exposify plugin.'
	}

	// Join apiOptions with the Pixabay API URL
	const apiUrl = `${appUrl}/api/v1/json`

	const apiParams = `?api_token=${apiKey}`

	// Fetch a response from the apiUrl
	return new Promise((resolve, reject) => {
		fetch(apiUrl + apiParams)
			.then(response => response.json())
			.then(data => {
				promises = []
				data.data.forEach(property => {
					const slug = property.attributes.slug
					promises.push(
						fetch(`${apiUrl}/${slug}${apiParams}`)
							.then(response => response.json())
							.then(data => {
								let property = data.data
								property.attributes.id = property.id
								const ensureField = function(...fields) {
									const field = fields.reduce((accumulator, currentValue) => (
										accumulator + '.attributes.' + currentValue
									))
									if (!_.get(property.attributes, field)) {
										_.set(property, 'attributes.' + field, '')
									}
								}
								ensureField('contact', 'display_name')
								ensureField('contact', 'email')
								ensureField('contact', 'phone')
								ensureField('contact', 'profile_picture')
								ensureField('energycertificate', 'type')
								ensureField('energycertificate', 'building_type')
								ensureField('energycertificate', 'energy_source')
								ensureField('energycertificate', 'construction_year')
								ensureField('energycertificate', 'issue_date')
								ensureField('energycertificate', 'valid_until')
								ensureField('energycertificate', 'energy_consumption')
								ensureField('energycertificate', 'warm_water_included')
								ensureField('energycertificate', 'class')

								const nodeData = processProperty(property)
								createNode(nodeData)
							})
					)
				})
				return promises
			}).then(promises => {
				return Promise.all(promises)
			}).then(() => {
				resolve()
			})
	})

}
