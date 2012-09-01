jQuery xPath plugin
===================
Copyright (C) 2012 Cristian Ganta [http://www.impactclub.ro]
   
* uses Document Object Model Level 3 XPath and Microsoft.XMLDOM object
* compatible with Firefox, Opera, Chrome and Internet Explorer 
* evaluates xPath Version 1.0 [http://www.w3.org/TR/xpath/]

use:
* $.xfind(xpath);
* $(context).xfind(xpath) 

examples:
* $.xfind("//body/div");
* $("body").xfind("/div/span"); 
* $("form").xfind("/div/span").xfind("/input[position()=1]"); 
* $($.parseXML(myxml)).xfind("/root/parent/child/*[local-name()='tag']");