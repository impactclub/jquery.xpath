/*
 * jQuery xPath plugin 0.1 beta
 * Copyright (C) 2012 Cristian Ganta [http://www.impactclub.ro]
 *   
 * uses Document Object Model Level 3 XPath and Microsoft.XMLDOM object
 * compatible with Firefox, Opera, Chrome and Internet Explorer 
 * evaluates xPath Version 1.0 [http://www.w3.org/TR/xpath/]
 * use:
 *   $.xfind(xpath);
 *   $(context).xfind(xpath) 
 * examples:
 *   $.xfind("//body/div");
 *   $("body").xfind("/div/span"); 
 *   $("form").xfind("/div/span").xfind("/input[position()=1]"); 
 *   $($.parseXML(myxml)).xfind("/root/parent/child/*[local-name()='tag']");
 */

(function ($) {

	// plugin version
	$.xpath = $.fn.xpath = '0.1 beta';

	/*
	  use: $.xfind(xpath);
	  alias for $(document).xfind(xpath);
	  @param (string) xpath selector expression
	  @return (object) jQuery result object
	*/
	$.xfind = function(expression) {
		return $(document).xfind(expression);
	};

	/*
	  use: $(context).xfind(xpath);
	  find xpath expression into given (array) context and return jQuery result object
	  @param (string) xpath selector expression
	  @return (object) jQuery result object
	*/
	$.fn.xfind = function(expression) {
		// matched results array		
		var nodes = [];
		// for each context items
		this.each(function() {
			// merge result into returned array
			$.merge(nodes,xpathfind(this,expression)); 
		});
		// remove duplicate results
		$.unique(nodes);
		// create new jQuery result collection
		result = this.pushStack(nodes);
		// store xpath expression
		result.selector = expression;
		// return matched result
		return result;
	};
	
	/*
	  private function
	  find xpath expression into given context and return matched array
	  @param (node) document context node
	  @param (string) xpath selector expression
	  @return (object) array of matched nodes
	*/ 	
	var xpathfind = function(context,expression) {
		// array of matched nodes
		var nodes = [];
		// test DOM3XPATH implementation 
		if (typeof(XPathResult) != 'undefined') {
			// CASE: Firefox, Opera, Chrome
			// get the ownerDocument of the context
			var domDoc = context.ownerDocument==null ? context : context.ownerDocument;
			// get the result object by evaluation the xpath expression 
			var result = domDoc.evaluate(expression, context, null, XPathResult.ANY_TYPE, null);
			// iterate through the available nodes
			var node = result.iterateNext();
			while (node) {
				// merge node into returned array
				$.merge(nodes,[node]);
				// continue iteration
				node = result.iterateNext();
			}
		} else {
			// CASE: Internet Explorer
			// create new XML Document
			var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			// copy each context node into the XML Document
			copyNode(xmlDoc, xmlDoc, context);
			// fix missing preceding / in xpath expression
			if (context != document && expression.indexOf('//') != 0)
				expression = '/*' + (expression.indexOf("/")!=0 ? "/":"") + expression;
			// set xpath as current expression language
			xmlDoc.setProperty("SelectionLanguage","XPath");
			xmlDoc.resolveExternals = false; xmlDoc.async = false;
			// get the result object by evaluation the xpath expression
			var result = xmlDoc.selectNodes(expression);
			// iterate through the available nodes
			var node = result.nextNode;
			while (node) {
				// check where to look for the result nodes
				if (context == document || context.ownerDocument == document) {
					// find matched node in document
					nodeFound = getNode(context,node);
					// node not found in document
					if (!nodeFound) nodeFound = node;
					// merge node into returned array
					$.merge(nodes,[nodeFound]); 
				} else {
					// merge matched node into returned array
					$.merge(nodes,[node]);
				}
				// continue iteration
				node = result.nextNode;
			}
		}
		// array of matched nodes
		return nodes;
	};

	/*
	  private method
	  recursively copy each context node into the parent element
	  @param (object) owner document
	  @param (object) owwner element
	  @param (object) node to be copied
	*/	
	var copyNode = function(owner, parent, node) {
		// get the documentElement of the node
		if (node.documentElement) node = node.documentElement;
		// get the ownerDocument of the parent node
		if (!owner) owner = parent.ownerDocument || parent;
		// node is text element
		if (node.nodeType == 3) {
			try {
				parent.appendChild(owner.createTextNode(node.nodeValue));
			} catch(e) { return; }
		// node is node element
		} else {
			// get the node name
			var nodeName = node.nodeName.toLowerCase();
			// ignore closing tags
	 		if (nodeName.indexOf("/") == 0) return;
	 		// create new element in owner document
			var newNode = owner.createElement(nodeName);
			// append the new elelment to the parent node
			newNode = parent.appendChild(newNode);
			// the @id attribute is not definded in node
			if (!node.id && node.uniqueID) {
				// create the @id attribute in the owner document
				var newAttribute = owner.createAttribute('id');
				// get the IE's uniqueID value 
				newAttribute.value = node.uniqueID;
				// attach the @id attribute to the new element
				newNode.setAttributeNode(newAttribute); 
				}
			// for each attribute of the node
			for (var i = 0; i < node.attributes.length; i ++ ) {
				// current attribute
				var attribute = node.attributes[i];
				// current attribute value
				var attributeValue = attribute.nodeValue;
				// if value is not null and the attribute is user defined
				if (attributeValue && attribute.specified) {
					// create a new attribute in the owner document
					var newAttribute = owner.createAttribute(attribute.nodeName);
					// set the attribute value
					newAttribute.value = attributeValue;
					// attach attribute to the new element
					newNode.setAttributeNode(newAttribute);				
				}
			}
			// number of child elelemnts of the node
			var length = node.childNodes.length;
			// for each child of the node
			for (var i = 0; i < length; i ++ ) {
				// recursively copy child nodes into the owner document
				copyNode(owner, newNode, node.childNodes[i]);
			}
		}
	};
	
	/*
	  private function
	  find given node in the gicven context
	  @param (node) document context node
	  @param (node) node to be found in context
	  @return (node) node reference found in context
	*/
	var getNode = function(context,node) {
		// no node found
		if (!node) return null;
		// get the ownerDocument of the context node
		if (context.ownerDocument) context = context.ownerDocument;
		// node is node element
		if (node.nodeType == 1) {
			// get the @id attribute of the node
			var id = node.attributes.getNamedItem("id");
			// find node in context by IE's uniqueId value
			if (id) return getElementByUniqueId(context, id.value);
		// node is attribute element
		} else if (node.nodeType == 2) {
			// get the parent node of the attribute
			var parent = node.selectSingleNode("..");
			// get the @id attribute of the parent
			var id = parent.attributes.getNamedItem("id");
			if (id) {
				// find node in context by IE's uniqueId value
				var result = getElementByUniqueId(context, id.text);
				// return the attribute of the found node 
				if (result) return result.attributes.getNamedItem(node.nodeName);
			}
		// node is text elelement
		} else if (node.nodeType == 3) {
			// get the parent node of the text node
			var parent = node.selectSingleNode("..");
			// get the @id attribute of the parent
			var id = parent.attributes.getNamedItem("id");
			if (id) {
				// find node in context by IE's uniqueId value
				var result = getElementByUniqueId(context, id.text);
				// for each child nodes of the parent
				return $(result.childNodes).each(function() {
					// find the text element
					if (this.nodeType == 3 && this.nodeValue == node.nodeValue)
						return this;
				});
			}
		}
	};

	/*
	  private function
	  find node by IE's uniqueId
	  @param (node) document context node
	  @param (string) unique id value
	  @return (node) node reference found in context
	*/ 
	getElementByUniqueId = function(context, id) {
		// get array all elements of the context 
		var elements = context.getElementsByTagName('*');
		// for each elelement
		for (var i = 0; i < elements.length; i ++ ) {
			// if uniqueID value matches given id value return current element
			if (elements[i].id == id || elements[i].uniqueID == id) return elements[i];
		}
		// no element found
		return null;
	};

})(jQuery);