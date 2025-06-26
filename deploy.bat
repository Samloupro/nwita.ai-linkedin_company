@echo off
git remote remove origin
git remote add origin https://github.com/Samloupro/nwita.ai-linkedin_company.git
git pull origin main --rebase
git add .
git commit -m "Deploy update project folder name to nwita.ai-linkedin_company"
git push -u origin main
