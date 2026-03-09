#!/bin/bash

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "Git not found. Installing..."
    sudo apt-get update && sudo apt-get install -y git
fi

# Initialize git repo
git init

# Add all files
git add .

# Commit with message
git commit -m "EduManage Pro - School Management System with Render deployment setup"

# Rename branch to main
git branch -M main

# Add remote origin
git remote add origin https://github.com/bossmaniano/EduManage-Pro-Tassia_School.git

# Push to GitHub
git push -u origin main

echo "Done! Project pushed to GitHub."
