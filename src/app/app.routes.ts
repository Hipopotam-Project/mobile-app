import { Routes } from '@angular/router';
import { FirstPageComponent } from './components/first-page/first-page.component';
import { LoginComponent } from './components/login/login.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { RegisterFarmComponent } from './components/register-farm/register-farm.component';

export const routes: Routes = [
    {path: '', redirectTo: '/first-page', pathMatch: 'full'},
    {path: 'first-page', component: FirstPageComponent},

    {path: 'login', component: LoginComponent},
    {path: 'sign-up', component: SignUpComponent},

    {path: 'register-farm', component: RegisterFarmComponent}
];

