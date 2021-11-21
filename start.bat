cd "%~dp0"
IF NOT EXIST "node_modules" CMD /C npm install
cls
npm start
pause
