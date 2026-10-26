import { Scenario, Given, When, Then } from './steps';

Scenario(`the service is up and shows its home page`,
  Given`the service is running`,
  When`I open the home page`,
  Then`I see "Example service"`,
);
