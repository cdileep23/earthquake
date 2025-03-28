import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 50 },  
    { duration: '20s', target: 100 }, 
    { duration: '10s', target: 0 },  
  ],
};

export default function () {
  let params = {
    headers: { 'Content-Type': 'application/json' },
  };

  let res = http.get('http://localhost:5000/earthquakes?starttime=2023-01-01&endtime=2023-12-31&magnitude=4', params);

  check(res, {
    'Status is 200': (r) => r.status === 200,
    'Response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
