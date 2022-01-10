@echo off
IF EXIST "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.js" (
    del "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.js"
)
IF EXIST "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.html" (
    del "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.html"
)
IF EXIST "C:\Program Files (x86)\Warcraft III\_retail_\webui\GlueManagerAltered.js" (
    del "C:\Program Files (x86)\Warcraft III\_retail_\webui\GlueManagerAltered.js"
)
mklink /h "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.html" "./src/webui.html"
mklink /h "C:\Program Files (x86)\Warcraft III\_retail_\webui\index.js" "./src/webui.js"
mklink /h "C:\Program Files (x86)\Warcraft III\_retail_\webui\GlueManagerAltered.js" "./GlueManagerAltered.js"