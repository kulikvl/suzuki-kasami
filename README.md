Suppose node A requests a lock and requsts B. B now has RN[A] = 2. But A thinks B is down so he tries to send one more time and B again receives it with RN[A] = 3. But B's token LN[A] is 1, and 1 != 3 - 1

Node A is in CS and token Q has B. B crushes and then recovers with RN init to 0. Then it gots his token and gots request from C. So in B node RN[C] = 1 but in token LN[C] it can easily be 13.

Commands useful for debugging/testing this app:

- `lsof -i :3000` list all processes with port 3000 opened
- `lsof -i :3000 -t | xargs kill -9` kill all such processes
- `ifconfig lo0` print loopback network interface and its assigned ips
- `sudo ifconfig lo0 alias 127.0.1.1` add new local ip to loopback subnet
- `sudo ifconfig lo0 -alias 127.0.1.1` delete that address
