# EcoTrackX – Carbon Footprint Calculator 🌱

🌐 **Live Website:** https://ecotrakx.netlify.app

## About the Project

EcoTrackX is a website I built to help people understand how their daily activities affect the environment. It calculates an estimated carbon footprint based on activities like travelling, electricity usage, food habits, flights and waste.

The main idea behind this project is to help users understand their carbon emissions, check their Eco Score and find simple ways to reduce their environmental impact.

## Features

- Calculate an estimated carbon footprint based on daily activities.
- View monthly and yearly carbon emission estimates.
- Get an Eco Score and Eco Level based on the calculation.
- View an emission breakdown for different categories.
- Get suggestions for reducing carbon emissions.
- Create an account and log in using Supabase authentication and email OTP verification.
- Save, view and delete calculation history after logging in.
- Use a responsive interface with an interactive 3D Earth visual.

## Live Demo

Check out the website here:

**https://ecotrakx.netlify.app**

## Technologies Used

- **HTML5** – Website structure
- **CSS** – Styling and responsive design
- **JavaScript** – Calculator logic and interactive features
- **Supabase** – Authentication and database
- **Three.js** – Interactive 3D Earth visual
- **Netlify** – Website hosting

## How to Run Locally

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Run `index.html` using the Live Server extension or another local web server.
4. Check `js/supabase-config.js` to make sure the Supabase configuration is correct.
5. If you want to test login or OTP locally, make sure your local development URL is allowed in Supabase Authentication settings.

## Project Structure

EcoTrackX/
├── index.html
├── css/
├── js/
├── logo_ecotrakx.png
└── README.md

The `css` folder contains the styles, while the `js` folder contains the calculator logic, authentication and other interactive features.

## Things to Know

- The carbon footprint values are estimates, not the results of a formal environmental audit.
- Calculation history is available to logged-in users when Supabase is configured correctly.
- Changes pushed to GitHub will not automatically update the live website unless GitHub is connected to Netlify for automatic deployment.

## Project Maintainer

**EcoTrackX Project**