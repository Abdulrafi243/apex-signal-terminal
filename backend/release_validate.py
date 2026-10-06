from app.main import app
from app.services.release_checks import run_release_checks
from app.models.signal import SignalResponse

result = run_release_checks()
assert result['status'] == 'PASS', result
assert len(app.routes) >= 40

a = SignalResponse(symbol='BTCUSDT', timeframe='15M', direction='WAIT', grade='REJECT', score=0)
b = SignalResponse(symbol='ETHUSDT', timeframe='15M', direction='WAIT', grade='REJECT', score=0)
a.setup.append('isolation-test')
assert b.setup == []
assert a.state == 'NO_TRADE'
print({'status': 'PASS', 'routes': len(app.routes), 'release_checks': result['passed']})
