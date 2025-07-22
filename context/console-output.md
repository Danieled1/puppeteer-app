## Perf Run: 2025-07-21T15-08-05-516Z
PS C:\Users\User\Desktop\localDebGitRepos\puppeteer-app> npm start -- login ticketPerf

C:\Users\User\Desktop\localDebGitRepos\puppeteer-app>doskey scursor=cursor $*

> puppeteer-app@1.0.0 start
> node main.js login ticketPerf

clearXHRLogs cleaned - 🧼
🚀 Running flow: login
📥 Login page DOM loaded in 5460ms
✅ Logged in. Submit Duration: 6667ms. Total Flow: 16853ms. URL: https://app.digitalschool.co.il/members/test_live_student/
🔎 After login, current URL: https://app.digitalschool.co.il/members/test_live_student/
⚠️ SLOW LOGIN PROCESSING: took 6667ms
Session cookies: [
  {
    name: 'wordpress_logged_in_fcaaa8ba167cd4f6745b870fac6ba043',
    value: 'test_live_student%7C1753283270%7CGH8xhLTfnraNgSvpj3OvPpjUqRIj4LnPdhLj07Qbv7p%7Ca652d02cec6082de1da659e53e30fb67fd5747ad9c3100692e1d86fc4fe5e948',
    domain: 'app.digitalschool.co.il',
    path: '/',
    expires: -1,
    size: 195,
    httpOnly: true,
    secure: true,
    session: true,
    priority: 'Medium',
    sameParty: false,
    sourceScheme: 'Secure',
    partitionKey: undefined
  },
  {
    name: 'wordpress_test_cookie',
    value: 'WP%20Cookie%20check',
    domain: 'app.digitalschool.co.il',
    path: '/',
    expires: -1,
    size: 40,
    httpOnly: false,
    secure: true,
    session: true,
    priority: 'Medium',
    sameParty: false,
    sourceScheme: 'Secure',
    partitionKey: undefined
  }
]
🚀 Running flow: ticketPerf
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:--  0:00:01 --:--:--     0
Cache headers for logged-in user:
 Cache-Control: no-cache, must-revalidate, max-age=0, no-store, private
X-Nginx-Upstream-Cache-Status: BYPASS

Perf data for group "Elementor_BuddyBoss" saved to: C:\Users\User\Desktop\localDebGitRepos\puppeteer-app\exports\dequeue-perf-Elementor_BuddyBoss-2025-07-21T15-07-57-910Z.json

📊 XHR Summary:
: 1
📁 Exported report:
 → C:\Users\User\Desktop\localDebGitRepos\puppeteer-app\exports\2025-07-21T15-08-05-516Z-report.json
 → C:\Users\User\Desktop\localDebGitRepos\puppeteer-app\exports\2025-07-21T15-08-05-516Z-report.csv
PS C:\Users\User\Desktop\localDebGitRepos\puppeteer-app> 