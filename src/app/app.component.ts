import { Component } from '@angular/core';
import { FirstPageComponent } from "./components/first-page/first-page.component";
import { ThankYouComponent } from './components/thank-you/thank-you.component';
import { LoginComponent } from './components/login/login.component';
import { RouterOutlet } from '@angular/router';
import { RegisterFarmComponent } from './components/register-farm/register-farm.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'mobile-app';
}
